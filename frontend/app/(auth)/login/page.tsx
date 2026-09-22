import { AuthContainer } from "@/components/auth/auth-container";

export default function Home() {
  return (
    <main className="flex-1 bg-gray-50 flex flex-col items-center justify-center min-h-screen p-4 md:p-8">
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-center gap-12">
        <div className="flex-1 flex flex-col items-start gap-4 lg:pr-12 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-3 w-full">
            <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center text-white font-bold text-xl">
              D
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              BancoDigital
            </h1>
          </div>
          <p className="text-gray-500 max-w-md mx-auto lg:mx-0 mt-4 text-sm leading-relaxed hidden lg:block">
            Sua conta digital completa com Pix, transferências gratuitas e controle total sobre suas finanças. Seguro, rápido e sem complicações.
          </p>
        </div>

        <div className="flex-1 w-full max-w-md">
          <AuthContainer />
        </div>
      </div>
    </main>
  );
}
