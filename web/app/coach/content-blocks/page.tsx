"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { RequireAuth } from "@/components/auth/require-auth";
import { CoachPlanDeliveryShell } from "@/components/coach/coach-plan-delivery-shell";
import { useAuthHeaders, authFetch } from "@/lib/api/client";
import {
  CONTENT_BLOCK_FILTER_CHIPS,
  filterBlocksByCategoryGroup,
  type ContentBlockCategoryGroup,
} from "@/lib/content-blocks/category-groups";

type Block = {
  id: string;
  slug: string;
  category: string;
  title: string;
  bodyJson: Record<string, unknown>;
  sortOrder: number;
};

function bodyPreview(bodyJson: Record<string, unknown>): string {
  if (Array.isArray(bodyJson.items)) {
    return bodyJson.items.join("\n");
  }
  if (typeof bodyJson.template === "string") {
    return bodyJson.template;
  }
  return JSON.stringify(bodyJson, null, 2);
}

function bodyFromEditor(text: string, original: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(original.items)) {
    return {
      ...original,
      items: text.split("\n").map((line) => line.trim()).filter(Boolean),
    };
  }
  if (typeof original.template === "string") {
    return { ...original, template: text };
  }
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return original;
  }
}

export default function ContentBlocksPage() {
  const getHeaders = useAuthHeaders();
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBody, setEditBody] = useState("");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [category, setCategory] = useState("nutrition_tips");
  const [filterGroup, setFilterGroup] = useState<ContentBlockCategoryGroup>("all");
  const [saving, setSaving] = useState(false);

  const filteredBlocks = useMemo(
    () => filterBlocksByCategoryGroup(blocks, filterGroup),
    [blocks, filterGroup],
  );

  async function load() {
    const data = await authFetch("/api/content-blocks", {}, getHeaders).then((r) => r.json());
    setBlocks(data);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function openBlock(block: Block) {
    if (expandedId === block.id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(block.id);
    setEditTitle(block.title);
    setEditSlug(block.slug);
    setEditCategory(block.category);
    setEditBody(bodyPreview(block.bodyJson));
  }

  async function saveBlock(block: Block) {
    setSaving(true);
    await authFetch(`/api/content-blocks/${block.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: editTitle,
        slug: editSlug,
        category: editCategory,
        sortOrder: block.sortOrder,
        bodyJson: bodyFromEditor(editBody, block.bodyJson),
      }),
    }, getHeaders);
    setSaving(false);
    setExpandedId(null);
    load();
  }

  async function createBlock(e: React.FormEvent) {
    e.preventDefault();
    await authFetch("/api/content-blocks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        slug,
        category,
        title,
        bodyJson: { items: ["New tip — edit below after creating."] },
      }),
    }, getHeaders);
    setTitle("");
    setSlug("");
    load();
  }

  return (
    <RequireAuth roles={["coach", "platform_admin"]}>
      <CoachPlanDeliveryShell
        eyebrow="Content blocks"
        title="Content block library"
        description="Reusable tips, grocery lists, and workout guidelines. Filter by nutrition or workout."
        maxWidth="2xl"
      >
        <div className="space-y-6">
          <p className="text-sm text-white/50">
            Nutrition templates reference these blocks.{" "}
            <Link href="/coach/plan-templates" className="text-[var(--brand-diet)] underline">
              View plan templates →
            </Link>
          </p>

          <div className="flex flex-wrap gap-2">
            {CONTENT_BLOCK_FILTER_CHIPS.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFilterGroup(chip.id)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  filterGroup === chip.id
                    ? "bg-[var(--brand-diet)] text-[var(--brand-dark)]"
                    : "border border-white/15 text-white/60"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
          <form onSubmit={createBlock} className="space-y-3 rounded-xl border border-white/10 p-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" required className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm" />
            <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="slug" required className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm" />
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark-surface)] px-3 py-2 text-sm">
              <option value="nutrition_tips">nutrition_tips</option>
              <option value="grocery_list">grocery_list</option>
              <option value="health_parameters">health_parameters</option>
              <option value="workout_guidelines">workout_guidelines</option>
              <option value="stretching_routine">stretching_routine</option>
              <option value="welcome_letter">welcome_letter</option>
              <option value="success_strategies">success_strategies</option>
            </select>
            <button type="submit" className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)]">Add block</button>
          </form>
          <ul className="space-y-2">
            {filteredBlocks.map((b) => (
              <li key={b.id} className="rounded-xl border border-white/10 bg-[var(--brand-dark-surface)]">
                <button
                  type="button"
                  onClick={() => openBlock(b)}
                  className="w-full p-4 text-left hover:bg-white/5"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{b.title}</p>
                    <span className="text-xs text-white/30">{expandedId === b.id ? "▲" : "▼"}</span>
                  </div>
                  <p className="text-xs text-white/40">{b.category} · {b.slug}</p>
                  {expandedId !== b.id && (
                    <p className="mt-2 line-clamp-2 text-xs text-white/50">{bodyPreview(b.bodyJson)}</p>
                  )}
                </button>
                {expandedId === b.id && (
                  <div className="space-y-3 border-t border-white/10 p-4">
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        value={editSlug}
                        onChange={(e) => setEditSlug(e.target.value)}
                        className="rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
                      />
                      <input
                        value={editCategory}
                        onChange={(e) => setEditCategory(e.target.value)}
                        className="rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 text-sm"
                      />
                    </div>
                    <textarea
                      value={editBody}
                      onChange={(e) => setEditBody(e.target.value)}
                      rows={8}
                      className="w-full rounded-lg border border-white/15 bg-[var(--brand-dark)] px-3 py-2 font-mono text-xs leading-relaxed"
                    />
                    <p className="text-xs text-white/40">
                      One line per bullet for list blocks; plain text for welcome letters.
                    </p>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveBlock(b)}
                      className="rounded-lg bg-[var(--brand-diet)] px-4 py-2 text-sm font-semibold text-[var(--brand-dark)] disabled:opacity-50"
                    >
                      {saving ? "Saving…" : "Save changes"}
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </CoachPlanDeliveryShell>
    </RequireAuth>
  );
}
