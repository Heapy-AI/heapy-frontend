package com.heapy.app

import android.content.Context
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.samsung.android.sdk.health.data.HealthDataService
import com.samsung.android.sdk.health.data.error.ErrorCode
import com.samsung.android.sdk.health.data.error.HealthDataException
import com.samsung.android.sdk.health.data.error.ResolvablePlatformException
import com.samsung.android.sdk.health.data.permission.AccessType
import com.samsung.android.sdk.health.data.permission.Permission
import com.samsung.android.sdk.health.data.request.DataType
import com.samsung.android.sdk.health.data.request.DataTypes
import com.samsung.android.sdk.health.data.request.LocalTimeFilter
import java.time.Instant
import java.time.LocalDateTime
import java.time.ZoneId
import java.util.UUID
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch

/** 설계의 11개 건강 항목을 요청하고 실제 허용된 읽기 권한을 반환한다. 작성자: 김진우 */
class SamsungHealthModule(private val context: ReactApplicationContext) : ReactContextBaseJavaModule(context) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val permissionByType = linkedMapOf(
        "sleep" to Permission.of(DataTypes.SLEEP, AccessType.READ),
        "heart_rate" to Permission.of(DataTypes.HEART_RATE, AccessType.READ),
        "blood_glucose" to Permission.of(DataTypes.BLOOD_GLUCOSE, AccessType.READ),
        "blood_pressure" to Permission.of(DataTypes.BLOOD_PRESSURE, AccessType.READ),
        "body_composition" to Permission.of(DataTypes.BODY_COMPOSITION, AccessType.READ),
        "exercise" to Permission.of(DataTypes.EXERCISE, AccessType.READ),
        "floors" to Permission.of(DataTypes.FLOORS_CLIMBED, AccessType.READ),
        "steps" to Permission.of(DataTypes.STEPS, AccessType.READ),
        "activity" to Permission.of(DataTypes.ACTIVITY_SUMMARY, AccessType.READ),
        "water" to Permission.of(DataTypes.WATER_INTAKE, AccessType.READ),
        "nutrition" to Permission.of(DataTypes.NUTRITION, AccessType.READ),
    )
    private val permissions = permissionByType.values.toSet()
    private val stepPermissions = setOf(permissionByType.getValue("steps"))
    private val store by lazy { HealthDataService.getStore(context, scope) }
    private var requestingPermissions = false

    override fun getName() = "HeapySamsungHealth"

    @ReactMethod
    fun requestReadPermissions(promise: Promise) {
        scope.launch {
            if (requestingPermissions) {
                promise.reject("SAMSUNG_BUSY", "이미 권한을 확인하고 있어요.")
                return@launch
            }
            val activity = context.currentActivity
            if (activity == null) {
                promise.reject("SAMSUNG_ACTIVITY", "앱 화면에서 다시 연결해 주세요.")
                return@launch
            }
            requestingPermissions = true
            try {
                var granted = store.getGrantedPermissions(permissions)
                if (!granted.containsAll(permissions)) {
                    store.requestPermissions(permissions, activity)
                    granted = store.getGrantedPermissions(permissions)
                }
                if (granted.isEmpty()) {
                    promise.reject("SAMSUNG_PERMISSION", "허용한 건강 데이터가 없어요. 읽기 권한을 선택해 주세요.")
                    return@launch
                }
                val preferences = context.getSharedPreferences("heapy.health.installation", Context.MODE_PRIVATE)
                val installationId = preferences.getString("id", null) ?: UUID.randomUUID().toString().also {
                    preferences.edit().putString("id", it).apply()
                }
                promise.resolve(Arguments.createMap().apply {
                    putString("deviceInstallationId", installationId)
                    putArray("grantedDataTypes", Arguments.createArray().apply {
                        permissionByType.forEach { (type, permission) ->
                            if (granted.contains(permission)) pushString(type)
                        }
                    })
                    putString("sdkVersion", "1.1.0")
                    putString("permissionCheckedAt", Instant.now().toString())
                })
            } catch (error: CancellationException) {
                promise.reject("SAMSUNG_CANCELLED", "권한 확인이 취소되었어요.")
                throw error
            } catch (error: Exception) {
                reject(error, promise)
            } finally {
                requestingPermissions = false
            }
        }
    }

    @ReactMethod
    fun readTodaySteps(promise: Promise) {
        scope.launch {
            try {
                if (!store.getGrantedPermissions(stepPermissions).containsAll(stepPermissions)) {
                    promise.reject("SAMSUNG_PERMISSION", "걸음 수 읽기 권한을 다시 허용해 주세요.")
                    return@launch
                }
                val now = LocalDateTime.now(ZoneId.of("Asia/Seoul"))
                val request = DataType.StepsType.TOTAL.requestBuilder
                    .setLocalTimeFilter(LocalTimeFilter.of(now.toLocalDate().atStartOfDay(), now))
                    .build()
                val result = store.aggregateData(request)
                val total = result.dataList.sumOf { it.value ?: 0L }
                promise.resolve(Arguments.createMap().apply {
                    putString("date", now.toLocalDate().toString())
                    putDouble("steps", total.toDouble())
                    putBoolean("hasData", result.dataList.isNotEmpty())
                    putString("readAt", Instant.now().toString())
                })
            } catch (error: CancellationException) {
                promise.reject("SAMSUNG_CANCELLED", "데이터 읽기가 취소되었어요.")
                throw error
            } catch (error: Exception) {
                reject(error, promise)
            }
        }
    }

    private fun reject(error: Exception, promise: Promise) {
        val code = (error as? HealthDataException)?.errorCode
        val message = when (code) {
            ErrorCode.ERR_PLATFORM_NOT_INSTALLED -> "삼성 헬스를 설치한 뒤 다시 연결해 주세요."
            ErrorCode.ERR_OLD_VERSION_PLATFORM -> "삼성 헬스를 최신 버전으로 업데이트해 주세요."
            ErrorCode.ERR_PLATFORM_DISABLED -> "휴대폰 설정에서 삼성 헬스를 활성화해 주세요."
            ErrorCode.ERR_PLATFORM_NOT_INITIALIZED -> "삼성 헬스를 실행하고 초기 설정을 완료해 주세요."
            ErrorCode.ERR_NO_USER_PERMISSION -> "해당 건강 데이터의 읽기 권한을 다시 허용해 주세요."
            ErrorCode.ERR_ACCESS_CONTROL, ErrorCode.ERR_INVALID_CALLER -> "삼성 헬스의 데이터 읽기 개발자 모드 또는 앱 등록 정보를 확인해 주세요."
            else -> "삼성 헬스에 연결하지 못했어요. 앱과 읽기 권한 설정을 확인한 뒤 다시 시도해 주세요."
        }
        if (error is ResolvablePlatformException && error.hasResolution) {
            context.currentActivity?.let { activity ->
                runCatching { error.resolve(activity) }
            }
        }
        promise.reject("SAMSUNG_${code ?: "UNAVAILABLE"}", message)
    }

    override fun invalidate() {
        scope.cancel()
        super.invalidate()
    }
}
