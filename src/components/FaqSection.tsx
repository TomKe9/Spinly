import React, { useState } from "react";
import { Plus, Minus, HelpCircle } from "lucide-react";
import { FAQS } from "../types";

export default function FaqSection() {
  const [openId, setOpenId] = useState<string | null>("faq-1");

  const toggleFaq = (id: string) => {
    if (openId === id) {
      setOpenId(null);
    } else {
      setOpenId(id);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto space-y-3.5">
      {FAQS.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div 
            key={faq.id}
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              isOpen 
                ? "bg-white border-brand-300 shadow-sm shadow-brand-100" 
                : "bg-white border-stone-200/80 hover:border-stone-300"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleFaq(faq.id)}
              className="w-full text-left p-5 flex items-center justify-between gap-4 font-bold text-stone-900 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 transition-all ${
                  isOpen ? "bg-brand-50 text-brand-700" : "bg-stone-100 text-stone-500 group-hover:text-stone-700"
                }`}>
                  <HelpCircle className="w-4 h-4 text-brand-600" />
                </div>
                <span className="text-sm md:text-base font-display hover:text-brand-750 transition-colors">
                  {faq.question}
                </span>
              </div>
              <div className={`shrink-0 p-1 rounded-full border transition-all ${
                isOpen ? "bg-brand-600 border-brand-500 text-white" : "bg-stone-50 border-stone-200 text-stone-400"
              }`}>
                {isOpen ? <Minus className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>

            {/* Simulated collapsible height slider */}
            <div 
              className={`transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-[300px] border-t border-stone-100" : "max-h-0"
              } overflow-hidden`}
            >
              <div className="p-5 bg-stone-50/50 text-stone-605 text-xs md:text-sm leading-relaxed font-semibold">
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
