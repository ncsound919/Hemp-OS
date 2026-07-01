/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */


import React from 'react';
import { ProcessStage } from '../../kernel/core/types.ts';
import { ExtractionConfigurator } from './stageConfigurator/ExtractionConfigurator.tsx';
import { WinterizationConfigurator } from './stageConfigurator/WinterizationConfigurator.tsx';
import { DecarbConfigurator } from './stageConfigurator/DecarbConfigurator.tsx';
import { DistillationConfigurator } from './stageConfigurator/DistillationConfigurator.tsx';

interface StageConfiguratorProps {
  stage: ProcessStage;
  onConfigChange: (stageId: string, updatedConfig: Record<string, any>) => void;
}

export const StageConfigurator: React.FC<StageConfiguratorProps> = ({
  stage,
  onConfigChange,
}) => {
  const { id, type, config } = stage;

  const handleUpdate = (newConfig: any) => {
    onConfigChange(id, newConfig);
  };

  switch (type) {
    case 'extraction':
      return <ExtractionConfigurator config={config as any} onUpdate={handleUpdate} />;
    case 'winterization':
      return <WinterizationConfigurator config={config as any} onUpdate={handleUpdate} />;
    case 'decarboxylation':
      return <DecarbConfigurator config={config as any} onUpdate={handleUpdate} />;
    case 'distillation':
      return <DistillationConfigurator config={config as any} onUpdate={handleUpdate} />;
    default:
      return null;
  }
};
