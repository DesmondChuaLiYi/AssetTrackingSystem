'use client'

import { useParams } from 'next/navigation'
import DynamicEdit from '@/components/dynamicEdit'

const editLocationConfig = {
  entityName: 'location',
  entityDisplayName: 'Locations',
  entityDisplayNameSingular: 'Location',
  apiEndpoint: '/api/location',
  primaryKey: 'location_id',
  pageTitle: 'Edit Location',
  backUrl: '/admin/location/Rooms',
  formFields: [
    {
      key: 'location_id',
      label: 'Location ID',
      type: 'text' as const,
      required: true,
      disabled: true
    },
    { key: 'name', label: 'Name', type: 'text' as const, required: true },
    { key: 'description', label: 'Description', type: 'textarea' as const },
    { key: 'block', label: 'Block', type: 'text' as const },
    { key: 'level', label: 'Level', type: 'number' as const }
  ]
}

export default function EditLocationPage() {
  const params = useParams()
  const id = params.id as string

  return <DynamicEdit config={editLocationConfig} recordId={id} />
}