import React from 'react';
import { Toggle, type ToggleProps } from '../../../../components/ui/Toggle.js';

export type WorkingHoursToggleProps = ToggleProps;

export const WorkingHoursToggle: React.FC<WorkingHoursToggleProps> = (props) => {
  return <Toggle showStatusLabel {...props} />;
};
