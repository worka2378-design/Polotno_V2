import React, { useState } from 'react';
import { Lock, ShieldCheck, X, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitPassword: (password: string) => Promise<boolean>;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSubmitPassword,
}) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setError('Введіть пароль');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const success = await onSubmitPassword(password);
      if (success) {
        setPassword('');
        onClose();
      } else {
        setError('Невірний пароль. Спробуйте ще раз.');
      }
    } catch (err) {
      setError('Помилка під час шифрування.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-in fade-in duration-200 select-none">
      <div 
        className="w-full max-w-sm p-5 bg-[#ede5d8] border border-stone-300 rounded-3xl relative animate-in zoom-in-95 duration-200 text-stone-900 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <Lock className="w-4 h-4 text-stone-700 shrink-0" />
          <div className="min-w-0 pr-6">
            <h3 className="text-base font-semibold text-stone-900">
              Захист бекапу паролем
            </h3>
            <p className="text-xs text-stone-600 mt-0.5 leading-relaxed">
              Вкажіть пароль для зашифрування файлу резервної копії (AES-256-GCM).
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(null);
              }}
              placeholder="Введіть пароль для бекапу..."
              className="w-full px-4 py-2.5 text-sm bg-[#e2d8c7] border border-stone-300 rounded-full text-stone-900 placeholder:text-stone-500 focus:outline-none focus:border-stone-500 transition-all pr-11"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full text-stone-600 hover:text-stone-900 transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 px-3.5 py-2 bg-stone-300/50 border border-stone-300 rounded-full text-xs text-stone-800">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-stone-600" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-stone-900 text-stone-100 hover:bg-stone-800 font-semibold text-sm rounded-full transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-zinc-600 border-t-zinc-900 rounded-full animate-spin" />
            ) : (
              <>
                <ShieldCheck className="w-4 h-4" />
                <span>Зашифрувати та зберегти</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
