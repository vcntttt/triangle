'use client';

import { useQuery } from '@tanstack/react-query';
import type { LabelInterface } from '@/lib/models';
import { labelOptionsQuery } from '@/src/data/labels';

export function useLabelOptions() {
   const { data = [] } = useQuery(labelOptionsQuery());

   return data as LabelInterface[];
}
