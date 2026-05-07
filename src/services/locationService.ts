/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

export interface IBGECity {
  id: number;
  nome: string;
}

export interface BrasilCEP {
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  service: string;
  location?: {
    type: string;
    coordinates: {
      longitude: string;
      latitude: string;
    };
  };
}

export async function fetchAddressByCEP(cep: string): Promise<BrasilCEP | null> {
  const cleanCEP = cep.replace(/\D/g, '');
  if (cleanCEP.length !== 8) return null;

  try {
    const response = await fetch(`https://brasilapi.com.br/api/cep/v2/${cleanCEP}`);
    if (!response.ok) throw new Error('CEP not found');
    return await response.json();
  } catch (error) {
    console.error('Error fetching CEP:', error);
    // Fallback to v1 if v2 fails
    try {
      const response = await fetch(`https://brasilapi.com.br/api/cep/v1/${cleanCEP}`);
      if (!response.ok) throw new Error('CEP not found');
      return await response.json();
    } catch (e) {
      return null;
    }
  }
}

export async function fetchStates(): Promise<IBGEState[]> {
  try {
    const response = await fetch('https://brasilapi.com.br/api/ibge/uf/v1');
    if (!response.ok) throw new Error('Failed to fetch states');
    const data = await response.json();
    return data.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
  } catch (error) {
    console.error('Error fetching states:', error);
    return [];
  }
}

export async function fetchCitiesByState(stateSigla: string): Promise<IBGECity[]> {
  try {
    const response = await fetch(`https://brasilapi.com.br/api/ibge/municipios/v1/${stateSigla}`);
    if (!response.ok) throw new Error('Failed to fetch cities');
    const data = await response.json();
    // BrasilAPI returns { nome, codigo_ibge }
    return data.map((city: any) => ({
      id: city.codigo_ibge,
      nome: city.nome
    }));
  } catch (error) {
    console.error('Error fetching cities:', error);
    return [];
  }
}
