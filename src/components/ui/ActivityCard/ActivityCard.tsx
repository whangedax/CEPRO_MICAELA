import React from 'react';
import { ModuleActionCard } from '../ModuleActionCard';
import {
  AutoStoriesIcon,
  FactCheckIcon,
  WorkspacePremiumIcon,
  FolderOpenIcon,
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
        return <AutoStoriesIcon className="w-5 h-5 text-[var(--ui-brand)]" />;
      case 'fact_check':
        return <FactCheckIcon className="w-5 h-5 text-[var(--ui-brand)]" />;
      case 'workspace_premium':
        return <WorkspacePremiumIcon className="w-5 h-5 text-[var(--ui-brand)]" />;
      case 'folder_open':
        return <FolderOpenIcon className="w-5 h-5 text-[var(--ui-brand)]" />;
      default:
        return <AutoStoriesIcon className="w-5 h-5 text-[var(--ui-brand)]" />;
    }
  };

  return (
    <ModuleActionCard
      title={title}
      description={description}
      icon={renderIcon()}
      action={actionText}
      onClick={() => onActionClick?.(title, originalRoute, actionText)}
    />
  );
};

export default ActivityCard;
