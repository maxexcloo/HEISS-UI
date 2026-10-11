import type { ComfyStatus, ModelActivity as Activity } from './types';

export function ModelActivity({ status }: { status: ComfyStatus }) {
  const activities = status.backends
    ? Object.entries(status.backends).flatMap(([backend, value]) => value.connected && value.modelActivity ? [{ activity: value.modelActivity, label: backend === 'video' ? 'Video' : 'Images' }] : [])
    : status.connected && status.modelActivity ? [{ activity: status.modelActivity, label: '' }] : [];
  if (!activities.length || status.restarting) return null;
  return (
    <div className="model-activity" aria-label="Model Activity">
      {activities.map(({ activity, label }: { activity: Activity; label: string }) => (
        <div key={label} className="model-activity-row">
          <span>{label ? `${label} · ` : ''}{activity.state === 'generating' ? 'Generating With' : 'Last Used'}:</span>
          <span className="model-activity-names" title={activity.models.join(', ')}>{activity.models.join(', ')}</span>
        </div>
      ))}
    </div>
  );
}
