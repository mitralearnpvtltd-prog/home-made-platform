type StateMessageProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: StateMessageProps) {
  return (
    <div className="ds-state">
      <h3 className="ds-state__title">{title}</h3>
      <p className="ds-state__message">{message}</p>
    </div>
  );
}

export function ErrorState({ title, message }: StateMessageProps) {
  return (
    <div className="ds-state" role="alert">
      <h3 className="ds-state__title">{title}</h3>
      <p className="ds-state__message">{message}</p>
    </div>
  );
}
