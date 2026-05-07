/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CollectionPoint, CollectionSchedule } from '../types';

export const MOCK_POINTS: CollectionPoint[] = [
  {
    id: '1',
    name: 'Ecoponto Jardim Botânico',
    address: 'Rua Prefeito Lothário Meissner, 450',
    lat: -25.4411,
    lng: -49.2391,
    state: 'Paraná',
    city: 'Curitiba',
    neighborhood: 'Jardim Botânico',
    type: 'Ecoponto',
    acceptedItems: ['Plástico', 'Papel', 'Metal', 'Vidro', 'Madeira'],
    description: 'Ponto de entrega voluntária de recicláveis e materiais de grande porte.'
  },
  {
    id: '2',
    name: 'Cooperativa Recicla Já',
    address: 'Rua das Flores, 123',
    lat: -25.4284,
    lng: -49.2733,
    state: 'Paraná',
    city: 'Curitiba',
    neighborhood: 'Centro',
    type: 'Cooperativa',
    acceptedItems: ['Plástico', 'Papel', 'Papelão', 'Alumínio'],
    description: 'Cooperativa de catadores que recebe doações diretas.'
  },
  {
    id: '3',
    name: 'PEV Shopping Estação',
    address: 'Av. Sete de Setembro, 2775',
    lat: -25.4385,
    lng: -49.2713,
    state: 'Paraná',
    city: 'Curitiba',
    neighborhood: 'Rebouças',
    type: 'PEV',
    acceptedItems: ['Pilhas', 'Baterias', 'Lâmpadas'],
    description: 'Contêiner para descarte de resíduos especiais.'
  },
  {
    id: '4',
    name: 'Ecoponto Pinheiros',
    address: 'Av. das Nações Unidas, 1234',
    lat: -23.5617,
    lng: -46.6627,
    state: 'São Paulo',
    city: 'São Paulo',
    neighborhood: 'Pinheiros',
    type: 'Ecoponto',
    acceptedItems: ['Óleo de Cozinha', 'Eletrônicos', 'Pneus'],
    description: 'Especializado em resíduos perigosos e volumosos.'
  },
  {
    id: '5',
    name: 'Ecoponto Central Rio',
    address: 'Av. Rio Branco, 1',
    lat: -22.8988,
    lng: -43.1818,
    state: 'Rio de Janeiro',
    city: 'Rio de Janeiro',
    neighborhood: 'Centro',
    type: 'Ecoponto',
    acceptedItems: ['Papel', 'Papelão', 'Metal'],
    description: 'Ponto estratégico no centro do Rio para descarte rápido.'
  },
  {
    id: '6',
    name: 'Cooperativa Belo Horizonte',
    address: 'Av. Afonso Pena, 1000',
    lat: -19.9217,
    lng: -43.9361,
    state: 'Minas Gerais',
    city: 'Belo Horizonte',
    neighborhood: 'Centro',
    type: 'Cooperativa',
    acceptedItems: ['Plástico', 'Vidro', 'Latas'],
    description: 'Recebe grandes volumes de cooperados e doações.'
  },
  {
    id: '7',
    name: 'Ecoponto Itaperuna Centro',
    address: 'Rua Major Porfírio Henriques, 10',
    lat: -21.2084,
    lng: -41.8881,
    state: 'Rio de Janeiro',
    city: 'Itaperuna',
    neighborhood: 'Centro',
    type: 'Ecoponto',
    acceptedItems: ['Papel', 'Metal', 'Plástico'],
    description: 'Ponto de coleta central em Itaperuna.'
  },
  {
    id: '8',
    name: 'PEV Juiz de Fora - Parque Halfeld',
    address: 'Rua Halfeld, s/n',
    lat: -21.7642,
    lng: -43.3496,
    state: 'Minas Gerais',
    city: 'Juiz de Fora',
    neighborhood: 'Centro',
    type: 'PEV',
    acceptedItems: ['Pilhas', 'Baterias', 'Lâmpadas'],
    description: 'Coleta de resíduos especiais no centro de JF.'
  },
  {
    id: '9',
    name: 'Ecoponto Ouro Preto - Praça Tiradentes',
    address: 'Praça Tiradentes, 1',
    lat: -20.3856,
    lng: -43.5035,
    state: 'Minas Gerais',
    city: 'Ouro Preto',
    neighborhood: 'Centro',
    type: 'Ecoponto',
    acceptedItems: ['Vidro', 'Alumínio', 'Plástico'],
    description: 'Preservando o patrimônio histórico através da reciclagem.'
  },
  {
    id: '10',
    name: 'Cooperativa Recicla Mariana',
    address: 'Rua Direita, 50',
    lat: -20.3778,
    lng: -43.4150,
    state: 'Minas Gerais',
    city: 'Mariana',
    neighborhood: 'Centro Histórico',
    type: 'Cooperativa',
    acceptedItems: ['Papelão', 'Plásticos', 'Metais'],
    description: 'Apoio à comunidade local de catadores.'
  }
];

export const MOCK_SCHEDULES: CollectionSchedule[] = [
  {
    id: 's1',
    locality: 'Centro',
    address: 'Área central e comercial',
    state: 'Paraná',
    city: 'Curitiba',
    days: ['Segunda', 'Quarta', 'Sexta'],
    timeRange: '08:00 - 12:00',
    shift: 'Morning'
  },
  {
    id: 's2',
    locality: 'Batel',
    address: 'Zona residencial e gastronômica',
    state: 'Paraná',
    city: 'Curitiba',
    days: ['Terça', 'Quinta', 'Sábado'],
    timeRange: '13:00 - 17:00',
    shift: 'Afternoon'
  },
  {
    id: 's3',
    locality: 'Jardim Botânico',
    address: 'Arredores do parque e campus',
    state: 'Paraná',
    city: 'Curitiba',
    days: ['Segunda', 'Quinta'],
    timeRange: '19:00 - 22:00',
    shift: 'Night'
  },
  {
    id: 's4',
    locality: 'Pinheiros',
    address: 'Ruas residenciais e comerciais',
    state: 'São Paulo',
    city: 'São Paulo',
    days: ['Quarta', 'Sábado'],
    timeRange: '08:00 - 12:00',
    shift: 'Morning'
  },
  {
    id: 's5',
    locality: 'Centro',
    address: 'Principais avenidas centrais',
    state: 'Rio de Janeiro',
    city: 'Itaperuna',
    days: ['Terça', 'Quinta'],
    timeRange: '07:30 - 11:30',
    shift: 'Morning'
  },
  {
    id: 's6',
    locality: 'Centro',
    address: 'Setor bancário e comercial',
    state: 'Minas Gerais',
    city: 'Muriaé',
    days: ['Segunda', 'Quinta'],
    timeRange: '14:00 - 18:00',
    shift: 'Afternoon'
  },
  {
    id: 's7',
    locality: 'São Mateus',
    address: 'Bairro residencial central',
    state: 'Minas Gerais',
    city: 'Juiz de Fora',
    days: ['Terça', 'Sexta'],
    timeRange: '08:00 - 12:00',
    shift: 'Morning'
  },
  {
    id: 's8',
    locality: 'Centro',
    address: 'Área histórica e central',
    state: 'Minas Gerais',
    city: 'Ouro Branco',
    days: ['Quarta', 'Sábado'],
    timeRange: '13:00 - 17:00',
    shift: 'Afternoon'
  },
  {
    id: 's9',
    locality: 'Bauxita',
    address: 'Vizinhança universitária',
    state: 'Minas Gerais',
    city: 'Ouro Preto',
    days: ['Segunda', 'Quarta'],
    timeRange: '19:00 - 22:00',
    shift: 'Night'
  },
  {
    id: 's10',
    locality: 'Centro',
    address: 'Região central da cidade',
    state: 'Minas Gerais',
    city: 'Itabirito',
    days: ['Terça', 'Sexta'],
    timeRange: '08:00 - 12:00',
    shift: 'Morning'
  },
  {
    id: 's11',
    locality: 'Centro',
    address: 'Casario histórico central',
    state: 'Minas Gerais',
    city: 'Mariana',
    days: ['Quinta'],
    timeRange: '13:00 - 17:00',
    shift: 'Afternoon'
  },
  {
    id: 's12',
    locality: 'Centro',
    address: 'Toda a área urbana',
    state: 'Minas Gerais',
    city: 'Queluzito',
    days: ['Sábado'],
    timeRange: '08:00 - 11:00',
    shift: 'Morning'
  }
];
