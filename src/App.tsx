/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { ComboBanner } from './components/ComboBanner';
import { Services } from './components/Services';
import { LogoPortfolio } from './components/LogoPortfolio';
import { Pricing } from './components/Pricing';
import { About } from './components/About';
import { FAQ } from './components/FAQ';
import { Contact } from './components/Contact';
import { QueryModal } from './components/QueryModal';
import { AdminPortal } from './components/AdminPortal';
import { ChatWidget } from './components/ChatWidget';

export default function App() {
  const [isQueryModalOpen, setIsQueryModalOpen] = useState(false);
  const [isAdminPortalOpen, setIsAdminPortalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('Website Design (+ Free Logo Bundle)');
  const [isChatOpen, setIsChatOpen] = useState(false);

  const handleOpenQueryModal = (serviceName?: string) => {
    setSelectedService(serviceName || 'General Inquiry');
    setIsQueryModalOpen(true);
  };

  const handleCloseQueryModal = () => {
    setIsQueryModalOpen(false);
  };

  const handleToggleChat = () => {
    setIsChatOpen((prev) => !prev);
  };

  return (
    <div className="min-h-screen bg-white text-[#090e1f] flex flex-col font-sans selection:bg-[#0047ff] selection:text-white">
      {/* Sticky Minimal Navbar */}
      <Navbar
        onOpenQuoteModal={handleOpenQueryModal}
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
      />

      {/* Main Content */}
      <main className="flex-1">
        {/* Full-width Hero with LTM-style vivid accents */}
        <Hero
          onOpenChat={() => setIsChatOpen(true)}
          onOpenQueryModal={handleOpenQueryModal}
        />

        {/* Dedicated Combo Highlight Banner: Website + Free Logo */}
        <ComboBanner onOpenQueryModal={handleOpenQueryModal} />

        {/* Clean Services Card Grid */}
        <Services onOpenQueryModal={handleOpenQueryModal} />

        {/* Logo Portfolio: Show gallery of sample logos for ₹999 quality preview */}
        <LogoPortfolio onOpenQueryModal={handleOpenQueryModal} />

        {/* Pricing Section */}
        <Pricing onOpenQuoteModal={handleOpenQueryModal} />

        {/* FAQ Section */}
        <FAQ onOpenQueryModal={handleOpenQueryModal} />

        {/* About Section */}
        <About />
      </main>

      {/* Contact Section & Footer */}
      <Contact
        onOpenQueryModal={handleOpenQueryModal}
        onOpenAdmin={() => setIsAdminPortalOpen(true)}
      />

      {/* Query Modal (service auto-filled) */}
      <QueryModal
        isOpen={isQueryModalOpen}
        serviceName={selectedService}
        onClose={handleCloseQueryModal}
      />

      {/* Admin Lead Management & Action Portal */}
      <AdminPortal
        isOpen={isAdminPortalOpen}
        onClose={() => setIsAdminPortalOpen(false)}
      />

      {/* AI Chatbot (Floating Bottom-Right Widget) */}
      <ChatWidget
        isOpen={isChatOpen}
        onToggle={handleToggleChat}
        onOpenQueryModal={handleOpenQueryModal}
      />
    </div>
  );
}
