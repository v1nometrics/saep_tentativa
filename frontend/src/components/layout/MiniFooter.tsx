"use client";
import { FC } from "react";

const MiniFooter: FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-100 border-t border-gray-200 text-sm text-gray-600 mt-8">
      <div className="max-w-screen-xl mx-auto px-6 py-6">
        <div className="flex justify-center">
          {/* Links */}
          <div className="hidden">
            <span className="hover:text-gray-800 cursor-pointer">Termo de Uso</span>
            <span>|</span>
            <span className="hover:text-gray-800 cursor-pointer">Privacidade & Política</span>
          </div>

          {/* Copyright */}
          <div className="text-center">
            © {currentYear} Innovatis. Todos os direitos reservados. Powered by Data Science Team
          </div>

          {/* Credits */}
          <div className="hidden">
            Powered by Data Science Team – Innovatis
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MiniFooter;
