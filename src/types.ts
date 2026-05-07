/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Language = 'pt-BR' | 'pt-PT' | 'en';

export interface CollectionPoint {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  state: string;
  city: string;
  neighborhood: string;
  cep?: string;
  type: 'PEV' | 'Ecoponto' | 'Cooperativa';
  acceptedItems: string[];
  description: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: any;
  status?: 'pending' | 'active' | 'rejected';
  imageUrl?: string;
}

export interface CollectionSchedule {
  id: string;
  locality: string;
  address?: string;
  state: string;
  city: string;
  days: string[];
  timeRange: string;
  shift: 'Morning' | 'Afternoon' | 'Night';
}

export interface RecyclingTip {
  id: string;
  topic: string;
  content: string;
  impactLabel: string;
}

export interface UserProfile {
  email: string | null;
  role: 'user' | 'moderator' | 'admin';
  createdAt: any;
  firstName?: string;
  lastName?: string;
  socialName?: string;
  state?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
  cep?: string;
  cpf?: string;
}

export interface Report {
  id?: string;
  pointId: string;
  pointName: string;
  reportedBy: string;
  reportedByName: string;
  reason: string;
  status: 'pending' | 'reviewed' | 'resolved';
  createdAt: any;
}

export interface RecyclingRoute {
  id?: string;
  state: string;
  city: string;
  neighborhood: string;
  street?: string;
  cep?: string;
  days: string[]; // e.g., ["Segunda", "Quarta"]
  period: 'manhã' | 'tarde' | 'noite';
  createdBy: string;
  createdByName?: string;
  createdAt: any;
}
