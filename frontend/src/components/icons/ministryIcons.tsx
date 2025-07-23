import React from 'react';
import {
  Building2,
  Wheat,
  GraduationCap,
  Stethoscope,
  Cpu,
  FlaskConical,
  Briefcase,
  Signal,
  Palette,
  Leaf,
  CloudSun,
  Tractor,
  Trophy,
  Plane,
  HandHeart,
  Users,
  Rocket,
  Handshake,
  Feather,
  Scale,
  Shield,
  Landmark
} from 'lucide-react';

export interface MinistryInfo {
  color: string;
  icon: React.ReactElement;
}

/**
 * Retorna cor e ícone adequados para o nome do ministério/órgão.
 * O ícone mantém tamanho padrão 16px (w-4 h-4). O Ministério da Educação
 * mantém o ícone de "GraduationCap" conforme orientação do usuário.
 */
export function getMinistryInfo(name: string): MinistryInfo {
  const lower = name.toLowerCase();

  // Core mapping by keywords
  if (lower.includes('saúde'))
    return {
      color: 'bg-emerald-50 border-emerald-200 text-emerald-800',
      icon: <Stethoscope className="w-4 h-4" />
    };
  if (lower.includes('educação'))
    return {
      color: 'bg-blue-50 border-blue-200 text-blue-800',
      icon: <GraduationCap className="w-4 h-4" />
    };
  if (lower.includes('justiça'))
    return {
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <Scale className="w-4 h-4" />
    };
  if (lower.includes('defesa'))
    return {
      color: 'bg-slate-50 border-slate-200 text-slate-800',
      icon: <Shield className="w-4 h-4" />
    };
  if (lower.includes('agricultura'))
    return {
      color: 'bg-green-50 border-green-200 text-green-800',
      icon: <Wheat className="w-4 h-4" />
    };
  if (lower.includes('ciência'))
    return {
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      icon: <FlaskConical className="w-4 h-4" />
    };
  if (lower.includes('tecnologia') || lower.includes('inovação'))
    return {
      color: 'bg-indigo-50 border-indigo-200 text-indigo-800',
      icon: <Cpu className="w-4 h-4" />
    };
  if (lower.includes('trabalho') || lower.includes('emprego'))
    return {
      color: 'bg-orange-50 border-orange-200 text-orange-800',
      icon: <Briefcase className="w-4 h-4" />
    };
  if (lower.includes('comunica'))
    return {
      color: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      icon: <Signal className="w-4 h-4" />
    };
  if (lower.includes('cultura'))
    return {
      color: 'bg-pink-50 border-pink-200 text-pink-800',
      icon: <Palette className="w-4 h-4" />
    };
  if (lower.includes('meio ambiente') || lower.includes('clima'))
    return {
      color: 'bg-teal-50 border-teal-200 text-teal-800',
      icon: <Leaf className="w-4 h-4" />
    };
  if (lower.includes('desenvolvimento agrário'))
    return {
      color: 'bg-lime-50 border-lime-200 text-lime-800',
      icon: <Tractor className="w-4 h-4" />
    };
  if (lower.includes('integração') || lower.includes('desenvolvimento regional'))
    return {
      color: 'bg-purple-50 border-purple-200 text-purple-800',
      icon: <Users className="w-4 h-4" />
    };
  if (lower.includes('turismo'))
    return {
      color: 'bg-rose-50 border-rose-200 text-rose-800',
      icon: <Plane className="w-4 h-4" />
    };
  if (lower.includes('esporte'))
    return {
      color: 'bg-fuchsia-50 border-fuchsia-200 text-fuchsia-800',
      icon: <Trophy className="w-4 h-4" />
    };
  if (lower.includes('assistência social') || lower.includes('família'))
    return {
      color: 'bg-red-50 border-red-200 text-red-800',
      icon: <HandHeart className="w-4 h-4" />
    };
  if (lower.includes('cidades'))
    return {
      color: 'bg-gray-50 border-gray-200 text-gray-800',
      icon: <Building2 className="w-4 h-4" />
    };
  if (lower.includes('mulheres'))
    return {
      color: 'bg-violet-50 border-violet-200 text-violet-800',
      icon: <Users className="w-4 h-4" />
    };
  if (lower.includes('igualdade racial'))
    return {
      color: 'bg-amber-50 border-amber-200 text-amber-800',
      icon: <Users className="w-4 h-4" />
    };
  if (lower.includes('empreendedorismo'))
    return {
      color: 'bg-cyan-50 border-cyan-200 text-cyan-800',
      icon: <Rocket className="w-4 h-4" />
    };
  if (lower.includes('direitos humanos'))
    return {
      color: 'bg-sky-50 border-sky-200 text-sky-800',
      icon: <Handshake className="w-4 h-4" />
    };
  if (lower.includes('povos indígenas'))
    return {
      color: 'bg-green-50 border-green-200 text-green-800',
      icon: <Feather className="w-4 h-4" />
    };

  // Fallback
  return {
    color: 'bg-gray-50 border-gray-200 text-gray-800',
    icon: <Landmark className="w-4 h-4" />
  };
}
