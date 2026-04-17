"use client";

/**
 * @component StepProducts
 * @description Step 2: Products and services — dynamic list of offerings.
 */

import type { OnboardingData } from "./OnboardingWizard";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  data: OnboardingData;
  updateData: (updates: Partial<OnboardingData>) => void;
}

export default function StepProducts({ data, updateData }: Props) {
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
        List your main products or services. This helps AI generate relevant keywords.
      </p>

      {data.products.map((product, index) => (
        <div
          key={index}
          className="p-4 rounded-xl bg-surface-800/30 border border-surface-700/20 space-y-3 animate-fade-in"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-surface-500">
              Product / Service #{index + 1}
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
            placeholder="Product or service name"
            className="input-field"
          />

          <textarea
            value={product.description}
            onChange={(e) => updateProduct(index, "description", e.target.value)}
            placeholder="Brief description — what is it, who is it for?"
            className="input-field min-h-[72px] resize-y"
            rows={2}
          />

          <input
            type="text"
            value={product.priceRange}
            onChange={(e) => updateProduct(index, "priceRange", e.target.value)}
            placeholder="Price range (optional) — e.g., $50-200, Premium, Budget"
            className="input-field"
          />
        </div>
      ))}

      <button onClick={addProduct} className="btn-secondary w-full justify-center">
        <Plus className="w-4 h-4" />
        Add Product / Service
      </button>
    </div>
  );
}
