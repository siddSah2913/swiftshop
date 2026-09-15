"use client";

// Admin product form: option-set editor. Manages up to MAX_OPTION_GROUPS
// named groups, each with up to MAX_OPTIONS_PER_GROUP options and a per-option
// stock. Posts the whole list as a hidden `optionsJson` field; the server
// parse-payload validates caps and the save writes it wholesale.

import { useState } from "react";
import {
  MAX_OPTION_GROUPS,
  MAX_OPTIONS_PER_GROUP,
  MAX_GROUP_NAME_LEN,
  MAX_OPTION_NAME_LEN,
  type OptionSetInput,
} from "@/lib/variants/types";

export type EditorLabels = {
  options: string;
  optionsHint: string;
  optionGroupName: string;
  optionName: string;
  optionStock: string;
  addOptionGroup: string;
  addOption: string;
  remove: string;
};

export function VariantEditor({
  initial,
  labels,
}: {
  initial: OptionSetInput[];
  labels: EditorLabels;
}) {
  const [groups, setGroups] = useState<OptionSetInput[]>(
    initial.length > 0
      ? initial
      : [],
  );

  const patchGroup = (i: number, g: OptionSetInput) =>
    setGroups((gs) => gs.map((x, j) => (j === i ? g : x)));

  const inputCls =
    "rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-900 focus:border-teal-600 focus:outline-none";

  return (
    <fieldset>
      <legend className="text-sm font-medium text-zinc-700">
        {labels.options}
      </legend>
      <p className="mt-1 text-xs text-zinc-500">{labels.optionsHint}</p>

      <div className="mt-3 space-y-3">
        {groups.map((g, gi) => (
          <div key={gi} className="rounded-lg border border-zinc-200 p-3">
            <div className="flex items-center gap-2">
              <input
                value={g.name}
                placeholder={labels.optionGroupName}
                maxLength={MAX_GROUP_NAME_LEN}
                onChange={(e) => patchGroup(gi, { ...g, name: e.target.value })}
                className={`min-w-0 flex-1 ${inputCls}`}
              />
              <button
                type="button"
                onClick={() => setGroups((gs) => gs.filter((_, j) => j !== gi))}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                {labels.remove}
              </button>
            </div>

            <div className="mt-2 space-y-2">
              {g.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2 text-sm">
                  <input
                    value={o.name}
                    placeholder={labels.optionName}
                    maxLength={MAX_OPTION_NAME_LEN}
                    onChange={(e) =>
                      patchGroup(gi, {
                        ...g,
                        options: g.options.map((x, j) =>
                          j === oi ? { ...x, name: e.target.value } : x,
                        ),
                      })
                    }
                    className={`min-w-0 flex-1 ${inputCls}`}
                  />
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={o.stock}
                    placeholder={labels.optionStock}
                    onChange={(e) =>
                      patchGroup(gi, {
                        ...g,
                        options: g.options.map((x, j) =>
                          j === oi ? { ...x, stock: Number(e.target.value) } : x,
                        ),
                      })
                    }
                    className={`w-20 text-right ${inputCls}`}
                  />
                  <button
                    type="button"
                    aria-label={labels.remove}
                    onClick={() =>
                      patchGroup(gi, {
                        ...g,
                        options: g.options.filter((_, j) => j !== oi),
                      })
                    }
                    className="text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            {g.options.length < MAX_OPTIONS_PER_GROUP ? (
              <button
                type="button"
                onClick={() =>
                  patchGroup(gi, {
                    ...g,
                    options: [...g.options, { name: "", stock: 0 }],
                  })
                }
                className="mt-2 text-xs font-medium text-teal-700 hover:text-teal-800"
              >
                + {labels.addOption}
              </button>
            ) : null}
          </div>
        ))}
      </div>

      {groups.length < MAX_OPTION_GROUPS ? (
        <button
          type="button"
          onClick={() =>
            setGroups((gs) => [
              ...gs,
              { name: "", options: [{ name: "", stock: 0 }] },
            ])
          }
          className="mt-3 text-sm font-medium text-teal-700 hover:text-teal-800"
        >
          + {labels.addOptionGroup}
        </button>
      ) : null}

      <input
        type="hidden"
        name="optionsJson"
        value={JSON.stringify(groups)}
      />
    </fieldset>
  );
}