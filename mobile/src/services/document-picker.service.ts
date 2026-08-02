import NativeSecureDocumentPicker from '../../specs/NativeSecureDocumentPicker';

export interface PickedDocument {
  uri: string;
  name: string;
  type: string | null;
  size: number | null;
}

export async function isPickerAvailable(): Promise<boolean> {
  try {
    return await NativeSecureDocumentPicker.isAvailable();
  } catch (err) {
    console.error('Failed to query NativeSecureDocumentPicker availability:', err);
    return false;
  }
}

export async function pickDocumentService(): Promise<PickedDocument> {
  const result = await NativeSecureDocumentPicker.pickDocument();
  return {
    uri: result.uri,
    name: result.name,
    type: result.type,
    size: result.size,
  };
}
