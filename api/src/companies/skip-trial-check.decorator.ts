import { SetMetadata } from '@nestjs/common';

export const SKIP_TRIAL_KEY = 'skipTrialCheck';
export const SkipTrialCheck = () => SetMetadata(SKIP_TRIAL_KEY, true);
