// 작성자: 김진우 — 실제 저장·갱신·인터셉터 코드를 불러오고 네트워크와 기기 저장소만 격리한다.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const realAxios = require('axios');
const root = path.resolve(__dirname, '..');
const deferred = () => {
  let resolve, reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
};
const tokens = (name = '기존', expired = false) => ({
  accessToken: name, refreshToken: `${name}-갱신`, tokenType: 'Bearer', nextStep: 'home',
  expiresAt: new Date(Date.now() + (expired ? -1000 : 3600000)).toISOString(),
});

function runtime(disk = { value: null }, handler = async () => tokens('새토큰')) {
  const modules = new Map();
  let calls = 0, expired = 0;
  const http = Object.assign(function () {}, realAxios);
  http.create = options => {
    const client = realAxios.create(options);
    client.defaults.adapter = async config => {
      calls++;
      try {
        const data = await handler(config);
        return { data: { success: true, data }, status: 200, statusText: 'OK', headers: {}, config };
      } catch (problem) {
        const status = problem.status || 0;
        throw new realAxios.AxiosError('격리된 요청 실패', 'ERR_TEST', config, undefined,
          status ? { status, data: problem.body || {}, headers: {}, statusText: '실패', config } : undefined);
      }
    };
    return client;
  };
  const mocks = {
    axios: http,
    'react-native-config': { API_BASE_URL: 'https://example.invalid' },
    'react-native': { NativeModules: { HeapyPush: { session: async () => {} } } },
    'react-native-keychain': {
      STORAGE_TYPE: { AES_GCM_NO_AUTH: '격리저장소' },
      getGenericPassword: async () => disk.value ? { password: disk.value } : false,
      setGenericPassword: async (_name, value) => { disk.value = value; return true; },
      resetGenericPassword: async () => { disk.value = null; return true; },
    },
  };
  function load(relative, parent = root) {
    if (mocks[relative]) return mocks[relative];
    let filename = path.resolve(parent, relative);
    if (!path.extname(filename)) filename += '.ts';
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    new Function('require', 'module', 'exports', code)(name => load(name, path.dirname(filename)), module, module.exports);
    return module.exports;
  }
  const storage = load('src/shared/storage/tokenStorage.ts').tokenStorage;
  const session = load('src/shared/api/authSession.ts');
  session.setSessionExpiredHandler(() => expired++);
  return { storage, session, load, disk, calls: () => calls, expired: () => expired };
}

test('앱을 다시 시작해도 보안 저장소의 유효한 로그인을 유지한다', async () => {
  const disk = { value: null };
  await runtime(disk).storage.save(tokens());
  const reopened = runtime(disk);
  assert.equal((await reopened.session.getValidSession()).accessToken, '기존');
  assert.equal(reopened.calls(), 0);
});

test('만료 토큰을 갱신하고 새 갱신 토큰까지 영구 저장한다', async () => {
  const app = runtime();
  await app.storage.save(tokens('기존', true));
  assert.equal((await app.session.getValidSession()).accessToken, '새토큰');
  assert.equal(JSON.parse(app.disk.value).refreshToken, '새토큰-갱신');
  assert.equal((await runtime(app.disk).session.getValidSession()).accessToken, '새토큰');
});

test('동시 요청 20개도 토큰 갱신은 한 번만 실행한다', async () => {
  const gate = deferred();
  const app = runtime(undefined, () => gate.promise);
  await app.storage.save(tokens('기존', true));
  const work = Promise.all(Array.from({ length: 20 }, () => app.session.getValidSession()));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(app.calls(), 1);
  gate.resolve(tokens('새토큰'));
  assert.equal((await work).length, 20);
});

test('네트워크 장애로 갱신이 실패해도 로그인 정보를 지우지 않는다', async () => {
  const app = runtime(undefined, async () => { throw { status: 0 }; });
  await app.storage.save(tokens('기존', true));
  await assert.rejects(app.session.getValidSession(), error => error.status === 0);
  assert.equal((await app.storage.get()).accessToken, '기존');
  assert.equal(app.expired(), 0);
});

test('서버가 갱신 토큰을 거부한 경우에만 재로그인으로 전환한다', async () => {
  const app = runtime(undefined, async () => { throw { status: 401 }; });
  await app.storage.save(tokens('기존', true));
  await assert.rejects(app.session.getValidSession(), error => error.status === 401);
  assert.equal(await app.storage.get(), null);
  assert.equal(app.expired(), 1);
});

test('로그아웃 뒤 도착한 갱신 응답이 로그인 상태를 되살리지 않는다', async () => {
  const gate = deferred();
  const app = runtime(undefined, () => gate.promise);
  await app.storage.save(tokens('기존', true));
  const work = app.session.getValidSession();
  await new Promise(resolve => setImmediate(resolve));
  await app.storage.clear();
  gate.resolve(tokens('늦은토큰'));
  await assert.rejects(work, error => error.code === 'SESSION-CHANGED');
  assert.equal(await app.storage.get(), null);
});

test('이전 계정의 늦은 갱신 실패가 새 계정을 로그아웃시키지 않는다', async () => {
  const gate = deferred();
  const app = runtime(undefined, () => gate.promise);
  await app.storage.save(tokens('이전계정', true));
  const work = app.session.getValidSession();
  await new Promise(resolve => setImmediate(resolve));
  await app.storage.save(tokens('새계정'));
  gate.reject({ status: 401 });
  await assert.rejects(work);
  assert.equal((await app.storage.get()).accessToken, '새계정');
  assert.equal(app.expired(), 0);
});

test('로그인 실패 401은 폼의 빨간 안내로 처리하고 전역 로그아웃을 실행하지 않는다', async () => {
  const app = runtime(undefined, async () => { throw { status: 401 }; });
  const { apiClient } = app.load('src/shared/api/client.ts');
  const { loginErrorMessage } = app.load('src/features/auth/loginErrorMessage.ts');
  await assert.rejects(apiClient.post('/api/auth/login', {}), error => {
    assert.equal(loginErrorMessage(error), '이메일 또는 비밀번호가 올바르지 않아요. 다시 확인해 주세요.');
    return true;
  });
  assert.equal(app.expired(), 0);
});

test('보호 API의 401은 갱신 후 한 번만 재요청한다', async () => {
  let protectedCalls = 0;
  const app = runtime(undefined, async config => {
    if (config.url === '/api/auth/refresh') return tokens('새토큰');
    protectedCalls++;
    if (protectedCalls === 1) throw { status: 401 };
    assert.equal(config.headers.Authorization, 'Bearer 새토큰');
    return { 완료: true };
  });
  await app.storage.save(tokens());
  const { apiClient } = app.load('src/shared/api/client.ts');
  assert.deepEqual((await apiClient.get('/api/users/me')).data, { 완료: true });
  assert.equal(protectedCalls, 2);
});

test('갱신 후에도 거부된 세션은 반복 재요청 없이 정리한다', async () => {
  const app = runtime(undefined, async config => {
    if (config.url === '/api/auth/refresh') return tokens('새토큰');
    throw { status: 401 };
  });
  await app.storage.save(tokens());
  const { apiClient } = app.load('src/shared/api/client.ts');
  await assert.rejects(apiClient.get('/api/users/me'));
  assert.equal(app.calls(), 3);
  assert.equal(await app.storage.get(), null);
});
