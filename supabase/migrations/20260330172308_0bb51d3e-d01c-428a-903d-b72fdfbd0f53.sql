
-- Documents table for PDF content chunks (RAG knowledge base)
CREATE TABLE public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  source text DEFAULT 'pdf',
  category text DEFAULT 'general',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

-- Public read access for chatbot queries
CREATE POLICY "Anyone can read documents" ON public.documents
  FOR SELECT TO anon, authenticated USING (true);

-- Only admins can manage documents
CREATE POLICY "Admins can manage documents" ON public.documents
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage chat sessions" ON public.chat_sessions
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can manage chat messages" ON public.chat_messages
  FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);

-- Triggers for updated_at
CREATE TRIGGER update_chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert PDF content as document chunks
INSERT INTO public.documents (title, content, source, category) VALUES
('About Integral University', 'Integral University, a seat of educational excellence, is a premier university located in Lucknow, the capital city of Uttar Pradesh, India. The university is duly approved by the University Grants Commission (UGC) under Sections 2(f) and 12B of the UGC Act, 1956. It is also approved by the National Medical Commission, Pharmacy Council of India, Indian Nursing Council, Council of Architecture, Bar Council of India, Indian Association of Physiotherapists, National Council for Teacher Education, and UP State Medical Faculty.', 'pdf', 'about'),

('Accreditation and Recognition', 'Integral University is accredited with an A+ grade by the National Assessment and Accreditation Council (NAAC) and recognized as a Scientific and Industrial Research Organisation (SIRO) by the Department of Scientific and Industrial Research, Ministry of Science and Technology, Government of India. Integral Hospital is accredited by the National Accreditation Board for Hospitals and Healthcare Providers (NABH), the laboratories are accredited by the National Accreditation Board for Testing and Calibration Laboratories (NABL), and the agriculture program is accredited by the Indian Council of Agricultural Research (ICAR), Government of India.', 'pdf', 'about'),

('University Statistics', 'Integral University has 225+ Faculty members across multiple departments. The university offers numerous programs with 15000+ currently enrolled students and 41000+ alumni worldwide. The university has 3500+ departments and hostellers.', 'pdf', 'about'),

('Contact Information', 'Integral University contact: Call +91 93351 77775. Website: https://www.iul.ac.in. Location: Kursi Road, Lucknow, Uttar Pradesh - 226026. Email: info@iul.ac.in. Phone: +91-522-2890812. Apply online at https://admission.iul.ac.in/', 'pdf', 'contact'),

('Campus and Infrastructure', 'Integral University is the first private university in India that delivers high-quality education at an affordable cost. It aims to nurture holistic growth of students by providing them with world-class infrastructure, pedagogic resources, experiential learning opportunities, industry exposure and employment opportunities. The campus spans over 100 acres with modern architecture, well-maintained gardens, and world-class infrastructure. Facilities include separate boys and girls hostels, state-of-the-art labs, sports complex, central library with 100,000+ books, cafeteria, medical center, Wi-Fi campus, and auditorium.', 'pdf', 'campus'),

('Top Recruiters', 'Top recruiters at Integral University include: Allana Group, TATA, Oppo, CSC, FRES, TATA Consultancy Services (TCS), Reliance Jio, Infocomm Limited, and many more leading companies that actively recruit from the university.', 'pdf', 'placements'),

('Research Areas', 'Latest research works at Integral University include: Wildlife Safety - Faculty developed a system towards wildlife safety. Brain Tumor Detection - Algorithm to help in early detection of brain tumors. Nanomaterials - Bottom-up approach for synthesis of nanomaterials with utility as antibacterial agents and photocatalysts. Nigella Sativa - Research on hepatoprotective properties. Endosomally Localized - Targeting toll-like receptors by Dectin 1 agonist nano vehicles.', 'pdf', 'research'),

('Notable Alumni', 'Notable alumni of Integral University include: IAS Mohd Mustafa (B.Tech CSE 2002), Mr. Arun Nair - Sr. Product Manager at Microsoft India R&D Pvt. Ltd. (B. Arch. 2003), IES Abhishek Gupta - Assistant Director, Indian Defence Service of Engineers (B.Tech. Civil 2008), Dr. Haider Raza - Associate Professor in AI, University of Essex (B.Tech CSE 2008), IRPS Renuka Tripathi - IRPS Officer, Railways, Capt Dr. Aditya Prasad - Captain, Medical Officer, Indian Armed Forces (MBBS 2019), IPS Syed Ali Abbas - Addl.DCP, Police Commissionerate UP, IRS Kritika Jaiswal - Chief Commissioner, Income Tax Department, Mr. Vikas Kannaujia - Deputy General Manager at Accenture.', 'pdf', 'alumni'),

('Current Events and News', 'Recent events at Integral University: Integral University received Best Stall Award at AgroTech 2026 organized by ICFA, New Delhi. Guest Lecture on Urban Flood: Risk Assessment, Mitigation and Resilience. Industry-Integrated Workshop on Contact Lens Fundamentals and Clinical Fitting. CyberVision 2026 - Cyber Security Awareness Reel Competition. Documentary Screening on Wetlands marks World Wetlands Day. Expert Lecture on Gender Equality in the Workplace. Corporate Training on Construction for UltraTech Cement Contractors. Fiesta 2026 - Artistic, Cultural, Literary, Technical and Sports Festival. Digital Payment Awareness Campaign. World Kidney Day Awareness Program.', 'pdf', 'events'),

('Notice Board - Jobs', 'Current job openings at Integral University: Applications invited for Post-Doctoral Certificate Course in Anesthesiology with Stipend. Walk-in Interview for Staff Nurse positions at Integral Institute of Medical Sciences and Research. Position vacant for Lab Instructor in Department of Electronics Engineering, University Polytechnic. Teaching posts available in Integral Institute of Nursing Sciences and Research. Teaching posts in Department of Physiotherapy and Occupational Therapy.', 'pdf', 'careers'),

('Examination Results', 'Recent examination results: Pre-Ph.D. Course Work Examination 2025-26. M.B.B.S Phase-III (Third Professional Part-I) Supplementary Examination Dec 2025. End Semester (Odd) Regular/Carryover Examination 2025-26. M.B.B.S Phase-III Regular Examination Oct-Nov 2025. M.B.B.S Phase-I (First Professional) Supplementary Examination Oct-Nov 2025.', 'pdf', 'examinations'),

('Admission Information', 'Ph.D. Final Result Session 2025-26 available at iul.ac.in. Admit Card for Ph.D. Entrance Test Session 2025-26 downloadable. MBBS Fee Structure for Session 2025-26 available. Revised Ph.D. Admission Notification Session 2025-26. U.P. Government Scholarship 2025-26 with important deadlines. Apply online through the university admission portal at admission.iul.ac.in.', 'pdf', 'admissions'),

('Upcoming Events', 'Upcoming events: Three-Month Introductory Urdu Language Programme for Foreign and Final Year Students. International Symposium on Computational and Characterization Techniques in Engineering and Sciences (CCTES-2026). 5th AIU National Moot Court Competition 2026 from 09-11 April. Value-Added Course on Introduction to Hydroponics Gardening. Value-Added Course on Core Concepts in Mathematical and Logical Thinking. Value Added Course on Networking using Cisco Packet Tracer. Value Added Course on Solar PV Systems Design, Installation and Assessment. Value-Added Course on Holistic Well-Being and Professional Ethics. 1-Week Capacity Building Program for Thriving Entrepreneurship Ecosystem. IIRS ISRO START-2026 Program. International Internship Opportunity with Korea-Based Healthcare Startup Clupea.', 'pdf', 'events'),

('International Collaborations', 'Integral University has international collaborations with 20+ universities worldwide. ISF-CIED, Integral University facilitates Global Exposure in AI-Enabled Healthcare. Integral Startups Foundation in collaboration with PUM, Netherlands. International Internship Opportunity with Korea-Based Healthcare Startup Clupea. IIRS ISRO START-2026 Program for enhancing knowledge in space-based observations.', 'pdf', 'international'),

('University Links and Resources', 'University resources available: Alumni network, Amenities, Career services, CCG&D (Centre for Career Guidance and Development), Fee Structure, Fitness facilities, Gallery, Grievance Registration, International Brochure, Hostel information, IEEE Region-10 Newsletter, Code of Conduct, Public Self Disclosure, IQAC (Internal Quality Assurance Cell), Library, MoU details, NIRF (National Institutional Ranking Framework), Newsletter archives, Policies, Prospectus, Brochure, Scholarship Cell, Self Study Report, Sports facilities, Telephone Directory, Transport Facilities, University e-mail Registration.', 'pdf', 'resources'),

('Advanced Pediatric Cardiac Care', 'Advanced Pediatric Cardiac Care Camp successfully conducted at Integral Hospital. Voluntary Blood Donation Drive organized on BPCL 50th Foundation Day. Cervical Cancer and HPV Vaccination Camp organized at Integral University. Expert Lecture on Leadership and Emotional Intelligence.', 'pdf', 'health'),

('Student Achievements', 'Integral University student wins National Award in the 4th National Environment Youth Parliament (NEYP) 2026 held at Nagpur, Maharashtra. A national initiative jointly organized by Students for Development (SFD), India. World Cancer Day observed by Department of Pathology, IIMSR.', 'pdf', 'achievements');
