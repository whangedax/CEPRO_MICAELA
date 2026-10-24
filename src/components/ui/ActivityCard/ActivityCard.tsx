import React from 'react';
import {
  AutoStoriesIcon,
  FactCheckIcon,
  WorkspacePremiumIcon,
  FolderOpenIcon,
  ArrowForwardIcon,
} from '../Icons';

export interface ActivityCardProps {
  id: string;
  title: string;
  description: string;
  actionText: string;
  originalRoute: string;
  iconName: 'auto_stories' | 'fact_check' | 'workspace_premium' | 'folder_open';
  onActionClick?: (title: string, route: string, actionText: string) => void;
}

export const ActivityCard: React.FC<ActivityCardProps> = ({
  title,
  description,
  actionText,
  originalRoute,
  iconName,
  onActionClick,
}) => {
  const renderIcon = () => {
    switch (iconName) {
      case 'auto_stories':
        return <AutoStoriesIcon className="w-5 h-5 text-[#13594A]" />;
      case 'fact_check':
        return <FactCheckIcon className="w-5 h-5 text-[#13594A]" />;
      case 'workspace_premium':
        return <WorkspacePremiumIcon className="w-5 h-5 text-[#13594A]" />;
      case 'folder_open':
        return <FolderOpenIcon className="w-5 h-5 text-[#13594A]" />;
      default:
        return <AutoStoriesIcon className="w-5 h-5 text-[#13594A]" />;
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onActionClick) {
      onActionClick(title, originalRoute, actionText);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={`${title}. ${description}. Acción: ${actionText}`}
      className="group relative w-full text-left bg-white rounded-2xl p-5 border border-slate-100/90 shadow-[0_4px_20px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_25px_rgba(19,89,74,0.08)] hover:border-[#13594A]/25 transition-all duration-300 flex flex-col justify-between overflow-hidden cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#13594A] focus-visible:ring-offset-2"
    >
      {/* Corner decorative gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#e6f4f1]/80 to-transparent rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-300" />

      <div>
        <div className="flex items-center justify-between mb-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#e6f4f1] flex items-center justify-center text-[#13594A] border border-[#13594A]/10 transition-transform group-hover:scale-105 duration-200">
            {renderIcon()}
          </div>
          <span className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-[#13594A] group-hover:text-white transition-all shadow-xs">
            <ArrowForwardIcon className="w-3.5 h-3.5" />
          </span>
        </div>
        <h3 className="text-[14px] text-[#172B28] font-bold mb-1 group-hover:text-[#13594A] transition-colors leading-snug">
          {title}
        </h3>
        <p className="text-[12px] text-slate-600 leading-relaxed font-normal">
          {description}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1 text-[#13594A] text-[12px] font-semibold">
        <span>{actionText}</span>
        <span className="transition-transform group-hover:translate-x-1">
          <ArrowForwardIcon className="w-3.5 h-3.5" />
        </span>
      </div>
    </button>
  );
};

export default ActivityCard;
