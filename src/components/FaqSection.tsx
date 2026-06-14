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
    <div className="w-full max-w-3xl mx-auto space-y-4">
      {FAQS.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div 
            key={faq.id}
            className={`border rounded-2xl transition-all duration-300 overflow-hidden ${
              isOpen 
                ? "bg-white border-indigo-200 shadow-lg shadow-indigo-100/35" 
                : "bg-white border-neutral-150 hover:border-neutral-300"
            }`}
          >
            <button
              type="button"
              onClick={() => toggleFaq(faq.id)}
              className="w-full text-left p-5 md:p-6 flex items-center justify-between gap-4 font-semibold text-neutral-900 group cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 transition-all ${
                  isOpen ? "bg-indigo-50 text-indigo-600" : "bg-neutral-50 text-neutral-400 group-hover:text-neutral-600"
                }`}>
                  <HelpCircle className="w-4 h-4" />
                </div>
                <span className="text-sm md:text-base font-display hover:text-indigo-600 transition-colors">
                  {faq.question}
                </span>
              </div>
              <div className={`shrink-0 p-1.5 rounded-full border transition-all ${
                isOpen ? "bg-indigo-600 border-indigo-600 text-white" : "bg-neutral-100 border-neutral-200 text-neutral-500"
              }`}>
                {isOpen ? <Minus className="w-3.5 h-3.5 stroke-[3]" /> : <Plus className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>

            {/* Simulated collapsible height slider */}
            <div 
              className={`transition-all duration-300 ease-in-out ${
                isOpen ? "max-h-[300px] border-t border-neutral-100" : "max-h-0"
              } overflow-hidden`}
            >
              <div className="p-5 md:p-6 bg-neutral-55/40 text-neutral-600 text-sm md:text-base leading-relaxed">
                {faq.answer}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
