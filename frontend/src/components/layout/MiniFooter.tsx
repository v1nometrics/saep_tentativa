"use client";
import { FC } from "react";

const MiniFooter: FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-gray-100 border-t border-gray-200 text-sm text-gray-600 mt-8">
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
          {/* Links */}
          <div className="flex justify-center md:justify-start space-x-2 whitespace-nowrap">
            <span className="hover:text-gray-800 cursor-pointer">Termo de Uso</span>
            <span>|</span>
            <span className="hover:text-gray-800 cursor-pointer">Privacidade & Política</span>
          </div>

          {/* Copyright */}
          <div className="text-center">
            © {currentYear} Innovatis MC. Todos os direitos reservados.
          </div>

          {/* Credits */}
          <div className="flex justify-center md:justify-end text-gray-600 hover:text-gray-800">
            Powered by Data Science Team – Innovatis MC
          </div>
        </div>
      </div>
    </footer>
  );
};

export default MiniFooter;
