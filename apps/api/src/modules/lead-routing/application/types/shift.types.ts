export type ShiftInput = {
  name: string;
  startTime: string;
  endTime: string;
  timezone?: string;
  weekdays: number[];
  isActive?: boolean;
};

export type ShiftMemberInput = {
  workspaceMemberId: string;
  leadCapacity: number;
  isShiftManager?: boolean;
};