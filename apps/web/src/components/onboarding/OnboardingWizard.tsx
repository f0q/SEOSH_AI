"use client";

/**
 * @component OnboardingWizard
 * @description 5-step onboarding wizard for setting up a new SEO project.
 * 
 * Steps:
 *   1. About Your Company — name, industry, description, geography
 *   2. Products & Services — what you sell/offer
 *   3. Target Audience — who buys from you, pain points
 *   4. Data Sources — website URL (future: socials)
 *   5. Competitors — competitor URLs and notes
 * 
 * Each step has AI-assisted suggestions based on previously entered data.
 */

import { useState, useCallback } from "react";
import StepCompany from "./StepCompany";
import StepProducts from "./StepProducts";
import StepAudience from "./StepAudience";
import StepDataSources from "./StepDataSources";
import StepCompetitors from "./StepCompetitors";
import {
  Building2,
  Package,
  Users,
  Globe,
  Swords,
  Check,
  ArrowRight,
  ArrowLeft,
  Sparkles,
} from "lucide-react";

export interface OnboardingData {
  companyName: string;
  industry: string;
  description: string;
  geography: string;
  products: Array<{ name: string; description: string; priceRange: string }>;
  audienceSegments: string[];
  painPoints: string[];
  websiteUrl: string;
  competitors: Array<{ url: string; name: string; notes: string }>;
}

const INITIAL_DATA: OnboardingData = {
  companyName: "",
  industry: "",
  description: "",
  geography: "",
  products: [{ name: "", description: "", priceRange: "" }],
  audienceSegments: [""],
  painPoints: [""],
  websiteUrl: "",
  competitors: [{ url: "", name: "", notes: "" }],
};

const STEPS = [
  { id: 1, title: "Company", icon: Building2, description: "About Your Company" },
  { id: 2, title: "Products", icon: Package, description: "Products & Services" },
  { id: 3, title: "Audience", icon: Users, description: "Target Audience" },
  { id: 4, title: "Data", icon: Globe, description: "Data Sources" },
  { id: 5, title: "Competitors", icon: Swords, description: "Competitors" },
];

export default function OnboardingWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>(INITIAL_DATA);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateData = useCallback((updates: Partial<OnboardingData>) => {
    setData((prev) => ({ ...prev, ...updates }));
  }, []);

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep((s) => s + 1);
  };

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep((s) => s - 1);
  };

  const handleFinish = async () => {
    setIsSubmitting(true);
    // TODO: Submit to API → create project + company profile
    console.log("Onboarding data:", data);
    setTimeout(() => {
      setIsSubmitting(false);
      // TODO: Navigate to project dashboard
    }, 2000);
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1: return data.companyName.trim().length > 0;
      case 2: return data.products.some((p) => p.name.trim().length > 0);
      case 3: return true; // Optional
      case 4: return true; // Optional
      case 5: return true; // Optional
      default: return true;
    }
  };

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center shadow-lg shadow-brand-500/25">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-surface-50">
            Let&apos;s set up your project
          </h1>
        </div>
        <p className="text-surface-400">
          Tell us about your business so we can help you grow your search traffic.
        </p>
      </div>

      {/* Step Indicators */}
      <div className="flex items-center justify-center gap-1 mb-10">
        {STEPS.map((step, index) => {
          const isCompleted = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          return (
            <div key={step.id} className="flex items-center">
              <button
                onClick={() => step.id < currentStep && setCurrentStep(step.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300 ${
                  isCurrent
                    ? "bg-brand-500/15 border border-brand-500/30 text-brand-400"
                    : isCompleted
                    ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 cursor-pointer hover:bg-emerald-500/15"
                    : "bg-surface-800/30 border border-surface-700/30 text-surface-500"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isCompleted
                      ? "bg-emerald-500/20 text-emerald-400"
                      : isCurrent
                      ? "bg-brand-500/20 text-brand-400"
                      : "bg-surface-700/50 text-surface-500"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    step.id
                  )}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{step.title}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 rounded transition-colors ${
                    isCompleted ? "bg-emerald-500/40" : "bg-surface-700/30"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <div className="glass-card p-8 mb-6 animate-slide-up" key={currentStep}>
        <div className="flex items-center gap-3 mb-6">
          {(() => {
            const StepIcon = STEPS[currentStep - 1].icon;
            return (
              <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-brand-400" />
              </div>
            );
          })()}
          <div>
            <h2 className="text-lg font-semibold text-surface-100">
              {STEPS[currentStep - 1].description}
            </h2>
            <p className="text-sm text-surface-500">
              Step {currentStep} of {STEPS.length}
            </p>
          </div>
        </div>

        {currentStep === 1 && <StepCompany data={data} updateData={updateData} />}
        {currentStep === 2 && <StepProducts data={data} updateData={updateData} />}
        {currentStep === 3 && <StepAudience data={data} updateData={updateData} />}
        {currentStep === 4 && <StepDataSources data={data} updateData={updateData} />}
        {currentStep === 5 && <StepCompetitors data={data} updateData={updateData} />}
      </div>

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={handleBack}
          disabled={currentStep === 1}
          className={`btn-ghost gap-2 ${currentStep === 1 ? "opacity-30 pointer-events-none" : ""}`}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        {currentStep < 5 ? (
          <button
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`btn-primary gap-2 ${!isStepValid() ? "opacity-50 pointer-events-none" : ""}`}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleFinish}
            disabled={isSubmitting}
            className="btn-primary gap-2"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Creating project...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Complete Setup
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
