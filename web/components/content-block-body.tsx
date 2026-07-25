type BlockBody = {
  items?: string[];
  categories?: Record<string, string[]>;
  template?: string;
};

export function ContentBlockBody({ bodyJson }: { bodyJson: BlockBody }) {
  if (bodyJson.template) {
    return <p className="whitespace-pre-wrap text-sm text-white/70">{bodyJson.template}</p>;
  }

  return (
    <div className="space-y-2 text-sm text-white/70">
      {bodyJson.items?.map((item, i) => (
        <p key={i}>• {item}</p>
      ))}
      {bodyJson.categories &&
        Object.entries(bodyJson.categories).map(([cat, items]) => (
          <div key={cat}>
            <p className="font-medium text-white/90">{cat}</p>
            {items.map((item, i) => (
              <p key={i} className="ml-2">
                • {item}
              </p>
            ))}
          </div>
        ))}
    </div>
  );
}
