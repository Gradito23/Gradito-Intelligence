import React from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { getConfigBySlug } from '@/lib/configMeta';
import ConfigCrudTable from '@/components/admin/ConfigCrudTable';

export default function ConfigCrudPage() {
  const { configType: slug } = useParams();
  const config = getConfigBySlug(slug);

  if (!config) {
    return <Navigate to="/admin/reference-data/service-areas" replace />;
  }

  return (
    <ConfigCrudTable
      configType={config.key}
      label={config.label}
      columns={config.columns}
    />
  );
}
