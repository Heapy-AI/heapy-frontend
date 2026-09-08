import type {
  CheckupFile,
  InputType,
} from '../src/features/dataConnection/types';
import { validateCheckupFile } from '../src/features/dataConnection/checkupValidation';
export function pickCheckupFile(
  inputType: InputType,
): Promise<CheckupFile | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept =
      inputType === 'pdf' ? 'application/pdf' : 'image/jpeg,image/png';
    if (inputType === 'camera') input.capture = 'environment';
    input.oncancel = () => resolve(null);
    input.onchange = () => {
      const selected = input.files?.[0];
      if (!selected) {
        resolve(null);
        return;
      }
      const file = {
        uri: 'preview-file',
        name: selected.name,
        size: selected.size,
        type: selected.type,
        inputType,
      };
      try {
        validateCheckupFile(file);
        resolve(file);
      } catch (error) {
        reject(error);
      }
    };
    input.click();
  });
}
