import {
  pick,
  types,
  isErrorWithCode,
  errorCodes,
} from '@react-native-documents/picker';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import { CheckupFile, InputType } from './types';
import { validateCheckupFile } from './checkupValidation';

export async function pickCheckupFile(
  inputType: InputType,
): Promise<CheckupFile | null> {
  try {
    let file: CheckupFile;
    if (inputType === 'pdf') {
      const [document] = await pick({
        type: [types.pdf],
        allowMultiSelection: false,
      });
      file = {
        uri: document.uri,
        name: document.name ?? '건강검진.pdf',
        type: document.type ?? 'application/pdf',
        size: document.size ?? 0,
        inputType,
      };
    } else {
      const result =
        inputType === 'camera'
          ? await launchCamera({
              mediaType: 'photo',
              quality: 0.9,
              saveToPhotos: false,
            })
          : await launchImageLibrary({
              mediaType: 'photo',
              selectionLimit: 1,
              assetRepresentationMode: 'compatible',
            });
      if (result.didCancel) return null;
      if (result.errorCode)
        throw new Error(
          result.errorCode === 'permission'
            ? '카메라 권한을 허용한 뒤 다시 시도해 주세요.'
            : '사진을 가져오지 못했습니다. 다시 시도해 주세요.',
        );
      const asset = result.assets?.[0];
      if (!asset?.uri) return null;
      file = {
        uri: asset.uri,
        name: asset.fileName ?? '건강검진.jpg',
        type: asset.type ?? 'image/jpeg',
        size: asset.fileSize ?? 0,
        inputType,
      };
    }
    validateCheckupFile(file);
    return file;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === errorCodes.OPERATION_CANCELED)
      return null;
    throw error;
  }
}
