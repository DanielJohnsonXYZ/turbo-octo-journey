-- Relationship Management Platform Schema v2
-- Run this in your Supabase SQL editor after creating a project

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Contacts table (expanded)
CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT,
  linkedin_url TEXT,
  twitter_handle TEXT,
  website_url TEXT,
  rss_feed_url TEXT,
  company TEXT,
  job_title TEXT,
  location TEXT,
  status TEXT,
  priority TEXT CHECK (priority IN ('high', 'medium', 'low')),
  associations TEXT[] DEFAULT '{}',
  communication_style TEXT,
  how_we_met TEXT,
  relationship_value TEXT[] DEFAULT '{}',
  is_professional BOOLEAN DEFAULT true,
  is_friend BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  dont_need_to_contact BOOLEAN DEFAULT false,
  last_contacted_at TIMESTAMP WITH TIME ZONE,
  next_contact_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  next_steps TEXT,
  last_update_notes TEXT,
  contact_score INTEGER CHECK (contact_score >= 0 AND contact_score <= 100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Research items table (expanded sources)
CREATE TABLE research_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  source TEXT CHECK (source IN ('linkedin', 'news', 'twitter', 'web', 'rss', 'manual', 'company')),
  source_name TEXT,
  title TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  raw_content TEXT,
  image_url TEXT,
  importance_score INTEGER CHECK (importance_score >= 1 AND importance_score <= 10),
  is_read BOOLEAN DEFAULT false,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interactions table (expanded types and channels)
CREATE TABLE interactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN (
    'outreach', 'response', 'meeting', 'call', 'note',
    'email_sent', 'email_received', 'linkedin_message', 'linkedin_connection',
    'linkedin_comment', 'twitter_mention', 'introduction', 'referral',
    'coffee_chat', 'event', 'collaboration', 'favor_asked', 'favor_given', 'milestone'
  )),
  channel TEXT CHECK (channel IN (
    'email', 'linkedin', 'twitter', 'whatsapp', 'phone',
    'video_call', 'in_person', 'slack', 'text', 'other'
  )),
  subject TEXT,
  content TEXT,
  outcome TEXT,
  follow_up_needed BOOLEAN DEFAULT false,
  follow_up_date TIMESTAMP WITH TIME ZONE,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  tags TEXT[] DEFAULT '{}',
  attachments TEXT[] DEFAULT '{}',
  occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Message drafts table
CREATE TABLE message_drafts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  context_used JSONB,
  generated_message TEXT NOT NULL,
  was_sent BOOLEAN DEFAULT false,
  was_edited BOOLEAN DEFAULT false,
  final_version TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Settings table (expanded)
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anthropic_api_key TEXT,
  newsapi_key TEXT,
  proxycurl_api_key TEXT,
  twitter_bearer_token TEXT,
  default_contact_frequency_days INTEGER DEFAULT 90,
  high_priority_frequency_days INTEGER DEFAULT 30,
  medium_priority_frequency_days INTEGER DEFAULT 60,
  low_priority_frequency_days INTEGER DEFAULT 120,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_contacts_priority ON contacts(priority);
CREATE INDEX idx_contacts_last_contacted ON contacts(last_contacted_at);
CREATE INDEX idx_contacts_next_contact ON contacts(next_contact_at);
CREATE INDEX idx_contacts_archived ON contacts(is_archived);
CREATE INDEX idx_contacts_company ON contacts(company);
CREATE INDEX idx_research_contact ON research_items(contact_id);
CREATE INDEX idx_research_fetched ON research_items(fetched_at);
CREATE INDEX idx_research_source ON research_items(source);
CREATE INDEX idx_interactions_contact ON interactions(contact_id);
CREATE INDEX idx_interactions_occurred ON interactions(occurred_at);
CREATE INDEX idx_interactions_type ON interactions(type);
CREATE INDEX idx_interactions_follow_up ON interactions(follow_up_needed, follow_up_date);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert default settings row
INSERT INTO settings (id) VALUES (uuid_generate_v4());

-- RLS Policies
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (update these when adding auth)
CREATE POLICY "Allow all for contacts" ON contacts FOR ALL USING (true);
CREATE POLICY "Allow all for research_items" ON research_items FOR ALL USING (true);
CREATE POLICY "Allow all for interactions" ON interactions FOR ALL USING (true);
CREATE POLICY "Allow all for message_drafts" ON message_drafts FOR ALL USING (true);
CREATE POLICY "Allow all for settings" ON settings FOR ALL USING (true);

-- Migration script for existing databases (run if updating from v1)
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS twitter_handle TEXT;
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS website_url TEXT;
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS rss_feed_url TEXT;
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS company TEXT;
-- ALTER TABLE contacts ADD COLUMN IF NOT EXISTS job_title TEXT;
-- ALTER TABLE research_items ADD COLUMN IF NOT EXISTS image_url TEXT;
-- ALTER TABLE interactions ADD COLUMN IF NOT EXISTS subject TEXT;
-- ALTER TABLE interactions ADD COLUMN IF NOT EXISTS follow_up_needed BOOLEAN DEFAULT false;
-- ALTER TABLE interactions ADD COLUMN IF NOT EXISTS follow_up_date TIMESTAMP WITH TIME ZONE;
-- ALTER TABLE interactions ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
-- ALTER TABLE interactions ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';
-- ALTER TABLE settings ADD COLUMN IF NOT EXISTS twitter_bearer_token TEXT;
