"use client";

import type { OnboardingData } from "./OnboardingWizard";
import { useTranslations } from "next-intl";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepProducts({ data, updateData }: Props) {
  const t = useTranslations("onboarding.products");

  const addProduct = () => {
    updateData({
      products: [...data.products, { name: "", description: "", priceRange: "" }],
    });
  };

  const removeProduct = (index: number) => {
    if (data.products.length <= 1) return;
    updateData({
      products: data.products.filter((_, i) => i !== index),
    });
  };

  const updateProduct = (index: number, field: string, value: string) => {
    const updated = data.products.map((p, i) =>
      i === index ? { ...p, [field]: value } : p
    );
    updateData({ products: updated });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-surface-400 mb-2">
        {t("intro")}
      </p>

      {data.products.map((product, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/20 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500">
              {t("header", { n: index + 1 })}
            </span>
            {data.products.length > 1 && (
              <button
                onClick={() => removeProduct(index)}
                className="btn-ghost p-1 text-surface-500 hover:text-error-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <input
            type="text"
            value={product.name}
            onChange={(e) => updateProduct(index, "name", e.target.value)}
            placeholder={t("namePlaceholder")}
            className="input-field"
          />

          <textarea
            value={product.description}
            onChange={(e) => updateProduct(index, "description", e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            className="input-field min-h-[72px] resize-y"
            rows={2}
          />

          <input
            type="text"
            value={product.priceRange}
            onChange={(e) => updateProduct(index, "priceRange", e.target.value)}
            placeholder={t("priceRangePlaceholder")}
            className="input-field"
          />
        </div>
      ))}

      <button onClick={addProduct} className="btn-secondary w-full justify-center">
        <Plus className="w-4 h-4" />
        {t("add")}
      </button>
    </div>
  );
}
