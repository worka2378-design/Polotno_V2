import React, { useState } from 'react';
import { Upload, X, Shield, FileCode, Check, AlertCircle, KeyRound } from 'lucide-react';
import { VaultEncryptedData, VaultPayload } from '../types';
import { decryptVault } from '../utils/crypto';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportData: (payload: VaultPayload, mode: 'replace' | 'merge') => void;
}

export const ImportModal: React.FC<ImportModalProps> = ({
  isOpen,
  onClose,
  onImportData,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<any>(null);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);
  const [password, setPassword] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace');
  const [decryptedPayload, setDecryptedPayload] = useState<VaultPayload | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setSelectedFile(null);
    setParsedData(null);
    setIsEncrypted(false);
    setPassword('');
    setErrorMsg('');
    setSuccessMsg('');
    setDecryptedPayload(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg('');
    setSuccessMsg('');
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const json = JSON.parse(text);

        // Check if encrypted
        if (json && json.salt && json.iv && json.data) {
          setIsEncrypted(true);
          setParsedData(json as VaultEncryptedData);
          setDecryptedPayload(null);
        } else if (json && Array.isArray(json.notes)) {
          setIsEncrypted(false);
          const payload: VaultPayload = {
            version: json.version || 1,
            notes: Array.isArray(json.notes) ? json.notes : [],
            canvasOffset: json.canvasOffset || { x: 0, y: 0 },
            canvasScale: json.canvasScale || 1,
          };
          setDecryptedPayload(payload);
        } else {
          setErrorMsg('Файл має невірний формат бекапу JSON.');
        }
      } catch (err) {
        setErrorMsg('Не вдалося прочитати JSON файл.');
      }
    };
    reader.readAsText(file);
  };

  const handleDecryptAndValidate = async () => {
    setErrorMsg('');
    if (!password) {
      setErrorMsg('Введіть пароль для розшифрування.');
      return;
    }

    if (!parsedData || !isEncrypted) return;

    const payload = await decryptVault(parsedData as VaultEncryptedData, password);
    if (!payload || !Array.isArray(payload.notes)) {
      setErrorMsg('Невірний пароль або пошкоджений файл.');
      return;
    }

    setDecryptedPayload(payload);
    setSuccessMsg('Файл успішно розшифровано!');
  };

  const handleImportSubmit = () => {
    if (!decryptedPayload) {
      setErrorMsg('Немає даних для імпорту.');
      return;
    }

    onImportData(decryptedPayload, importMode);
    handleClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-md p-5 bg-[#ede5d8] border border-stone-300 rounded-3xl relative animate-in zoom-in-95 duration-200 text-stone-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <Upload className="w-4 h-4 text-stone-700" />
          <div>
            <h3 className="text-base font-semibold text-stone-900">Імпорт бекапу</h3>
            <p className="text-xs text-stone-600">Відновлення нотаток з JSON або зашифрованого сховища</p>
          </div>
        </div>

        {/* File Select */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-2">
              Виберіть файл резервної копії (.json)
            </label>
            <label className="flex flex-col items-center justify-center w-full h-28 border border-dashed border-stone-400 rounded-2xl cursor-pointer hover:border-stone-600 transition-colors bg-[#e2d8c7]/50">
              <Upload className="w-5 h-5 text-stone-600 mb-2" />
              <span className="text-xs text-stone-800 font-medium">
                {selectedFile ? selectedFile.name : 'Натисніть для вибору файлу'}
              </span>
              <span className="text-[10px] text-stone-500 mt-1">
                Підтримуються plain .json та encrypted .json
              </span>
              <input
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          </div>

          {/* Encrypted Password Prompt */}
          {isEncrypted && !decryptedPayload && (
            <div className="space-y-2 p-3 bg-[#e2d8c7] border border-stone-300 rounded-2xl">
              <div className="flex items-center gap-2 text-xs text-stone-800 font-medium">
                <Shield className="w-4 h-4 text-stone-600 shrink-0" />
                <span>Зашифрований бекап</span>
              </div>
              <p className="text-xs text-stone-600">
                Введіть ваш пароль для розшифрування вмісту сховища:
              </p>
              <div className="relative mt-2">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleDecryptAndValidate()}
                  placeholder="Майстер-пароль..."
                  className="w-full px-4 py-2 bg-[#ede5d8] border border-stone-300 text-stone-900 placeholder:text-stone-500 text-sm focus:outline-none focus:border-stone-500 rounded-full"
                />
              </div>
              <button
                onClick={handleDecryptAndValidate}
                className="w-full mt-2 px-4 py-2 bg-stone-900 text-stone-100 font-medium text-xs rounded-full hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
              >
                <KeyRound className="w-4 h-4" />
                <span>Розшифрувати</span>
              </button>
            </div>
          )}

          {/* Ready to Import Section */}
          {decryptedPayload && (
            <div className="space-y-3">
              <div className="p-3 bg-[#e2d8c7]/80 border border-stone-300 rounded-2xl flex items-center gap-2 text-xs text-stone-800">
                <FileCode className="w-4 h-4 text-stone-600 shrink-0" />
                <span>
                  Знайдено: {decryptedPayload.notes?.length || 0} нотаток
                </span>
              </div>

              <div>
                <label className="block text-xs font-medium text-stone-600 mb-2">
                  Режим імпорту:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setImportMode('replace')}
                    className={`px-3 py-2 text-xs font-medium rounded-full border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      importMode === 'replace'
                        ? 'border-stone-800 text-stone-900 bg-stone-300/60'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    {importMode === 'replace' && <Check className="w-3.5 h-3.5" />}
                    <span>Замінити полотно</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setImportMode('merge')}
                    className={`px-3 py-2 text-xs font-medium rounded-full border transition-colors cursor-pointer flex items-center justify-center gap-1.5 ${
                      importMode === 'merge'
                        ? 'border-stone-800 text-stone-900 bg-stone-300/60'
                        : 'border-stone-300 text-stone-600'
                    }`}
                  >
                    {importMode === 'merge' && <Check className="w-3.5 h-3.5" />}
                    <span>Додати до наявного</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Messages */}
          {errorMsg && (
            <div className="flex items-center gap-2 text-xs text-stone-800 p-2.5 bg-stone-300/80 border border-stone-300 rounded-full">
              <AlertCircle className="w-4 h-4 text-stone-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 text-xs text-stone-800 p-2.5 bg-stone-300/80 border border-stone-300 rounded-full">
              <Check className="w-4 h-4 text-stone-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit Action */}
          {decryptedPayload && (
            <button
              onClick={handleImportSubmit}
              className="w-full py-2.5 px-4 bg-stone-900 text-stone-100 font-semibold text-xs rounded-full hover:bg-stone-800 transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Завантажити та відновити</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
