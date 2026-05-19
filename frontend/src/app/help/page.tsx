"use client";

import {
  HelpCircleIcon,
  TruckIcon,
  CreditCardIcon,
  RefreshCcwIcon,
  ShieldCheckIcon,
} from "lucide-react";
import Link from "next/link";

export default function HelpPage() {
  // Frequently Asked Questions data array
  const faqs = [
    {
      question: "What is the delivery timeframe within Egypt?",
      answer:
        "Orders are typically delivered within 2-5 business days for Cairo and Giza, and 3-7 business days for other governorates.",
      icon: <TruckIcon className="size-5 text-primary" />,
    },
    {
      question: "What payment methods do you accept?",
      answer:
        "We currently support Cash on Delivery (COD), Credit/Debit cards (Visa/Mastercard), and Meeza cards.",
      icon: <CreditCardIcon className="size-5 text-primary" />,
    },
    {
      question: "Can I inspect the product before paying?",
      answer:
        "Yes, you are encouraged to inspect your package with the courier present before finalizing the payment.",
      icon: <ShieldCheckIcon className="size-5 text-primary" />,
    },
    {
      question: "How do I return or exchange an item?",
      answer:
        "We offer a 14-day return and exchange policy from the date of delivery. The item must be in its original condition.",
      icon: <RefreshCcwIcon className="size-5 text-primary" />,
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8 space-y-12 max-w-5xl">
      {/* Page Header Section */}
      <section className="text-center space-y-4">
        <div className="badge badge-primary badge-outline font-semibold tracking-wide uppercase">
          Support Center
        </div>
        <h1 className="text-4xl lg:text-6xl font-black tracking-tighter uppercase leading-tight">
          How can we <span className="text-primary italic">Help?</span>
        </h1>
      </section>

      {/* Accordion FAQ Section */}
      <section className="grid gap-4">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className="collapse collapse-plus bg-base-300 rounded-4xl border border-base-content/5 shadow-sm"
          >
            <input type="checkbox" className="peer" />
            <div className="collapse-title text-xl font-bold flex items-center gap-4 py-6 px-8">
              <div className="bg-base-100 p-3 rounded-2xl">{faq.icon}</div>
              <span className="flex-1">{faq.question}</span>
            </div>
            <div className="collapse-content px-8 pb-6 text-base-content/70">
              <p className="border-t border-base-content/5 pt-4">
                {faq.answer}
              </p>
            </div>
          </div>
        ))}
      </section>

      {/* Contact CTA Section */}
      <div className="bg-primary/5 rounded-[3rem] p-10 text-center border border-primary/10">
        <HelpCircleIcon className="size-12 text-primary mx-auto mb-4 opacity-80" />
        <h3 className="font-black text-2xl uppercase tracking-tighter">
          Still have questions?
        </h3>
        <p className="text-base-content/60 mb-6 max-w-sm mx-auto">
          Our customer support team is available to assist you via our
          integrated AI chat.
        </p>

        {/* Action Buttons Container */}
        <div className="flex flex-wrap justify-center gap-12">
          {/* Link to trigger AI Chat or Contact flow */}
          <Link href="/contact">
            <button
              className="
              btn btn-primary w-full sm:w-auto rounded-2xl px-10 
              shadow-lg shadow-primary/20
              transition-all duration-300 ease-in-out
              hover:scale-105 hover:shadow-2xl hover:shadow-primary/40 
              active:scale-95
            "
            >
              Contact Support
            </button>
          </Link>

          {/* Return to shopping gallery */}
          <Link href="/">
            <button
              className="
              btn btn-ghost btn-outline w-full sm:w-auto rounded-2xl px-8 
              transition-all duration-300 ease-in-out
              hover:scale-105 active:scale-95
              hover:border-primary hover:text-primary hover:bg-transparent
              "
            >
              Back to Shopping
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
}
