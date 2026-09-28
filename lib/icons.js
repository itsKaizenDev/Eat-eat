import {
  Zap, Turtle, Shrink, Skull, Orbit, Scissors, Sparkles, Bomb, Moon,
  Apple, HelpCircle, Grid3x3, Timer, Dices, Flame, Users, Heart, Ban,
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, Trophy, Gamepad2, ArrowLeftRight,
} from 'lucide-react';

// Satu registry icon (lucide) buat semua bagian UI — gantiin emoji lama.
// Dipanggil via ICONS[key], key sama kayak type efek / kind apel / mode.
export const ICONS = {
  // efek
  fast: Zap,
  slow: Turtle,
  shrink: Shrink,
  swarm: Skull,
  teleport: Orbit,
  nerf: Scissors,
  buff: Sparkles,
  bomb: Bomb,
  dark: Moon,
  // apel
  normal: Apple,
  big: Apple,
  poison: Skull,
  lucky: HelpCircle,
  // mode
  classic: Grid3x3,
  portal: Orbit,
  timeattack: Timer,
  mayhem: Dices,
  mayhemplus: Flame,
  multiplayer: Users,
  // umum
  wall: Ban,
  help: HelpCircle,
  trophy: Trophy,
  gamepad: Gamepad2,
  swap: ArrowLeftRight,
  heart: Heart,
  up: ChevronUp,
  down: ChevronDown,
  left: ChevronLeft,
  right: ChevronRight,
};
