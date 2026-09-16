/**
 * Colmena Segura - Swarm Simulator & Multi-Agent Bot Injector
 * Simulates multiple virtual citizens triggering alerts in real-time to demonstrate
 * consensus escalation, seismic pulse aggregation, and dispatch cycles.
 */

import { swarmEngine } from './swarmEngine.js';
import { syncBus } from './syncBus.js';
import { sounds } from './soundEffects.js';

export class SwarmSimulator {
  constructor() {
    this.activeSimulations = [];
  }

  /**
   * Scenario 1: Street fight escalation (Riña callejera en cruce concurrido)
   * 1st citizen reports -> Preventive amber radar
   * 2nd citizen confirms at 60m -> Hive consensus reached -> Critical red alarm!
   * 3rd citizen confirms -> Swarm density increases
   */
  async runStreetFightScenario(baseLocation = { lat: 19.4326, lng: -99.1332 }) {
    sounds.playClick();

    // 1. Citizen 1 triggers
    const c1Id = 'sim_citizen_rodrigo';
    swarmEngine.reportIncident({
      lat: baseLocation.lat,
      lng: baseLocation.lng,
      category: 'FIGHT',
      note: 'Riña empezando entre varios sujetos frente a tienda de conveniencia.',
      userId: c1Id
    });

    // 2. Wait 2 seconds, then Citizen 2 (60 meters away) triggers
    await this.delay(2000);

    const c2Id = 'sim_citizen_mariana';
    // Offset ~60m
    const c2Lat = baseLocation.lat + 0.00045;
    const c2Lng = baseLocation.lng + 0.00035;

    swarmEngine.reportIncident({
      lat: c2Lat,
      lng: c2Lng,
      category: 'FIGHT',
      note: 'Confirmado, están golpeándose y bloqueando la banqueta.',
      userId: c2Id
    });

    // 3. Wait 2.5 seconds, Citizen 3 confirms
    await this.delay(2500);

    const c3Id = 'sim_citizen_carlos';
    const c3Lat = baseLocation.lat - 0.00035;
    const c3Lng = baseLocation.lng + 0.00025;

    swarmEngine.reportIncident({
      lat: c3Lat,
      lng: c3Lng,
      category: 'FIGHT',
      note: 'Hay gritos y personas corriendo.',
      userId: c3Id
    });

    return true;
  }

  /**
   * Scenario 2: Armed robbery swarm detection in high-risk zone
   */
  async runRobberyScenario(baseLocation = { lat: 19.4360, lng: -99.1300 }) {
    sounds.playClick();

    const c1Id = 'sim_citizen_lucia';
    swarmEngine.reportIncident({
      lat: baseLocation.lat,
      lng: baseLocation.lng,
      category: 'ROBBERY',
      note: 'Asalto a mano armada a transeúntes.',
      userId: c1Id
    });

    await this.delay(1800);

    const c2Id = 'sim_citizen_diego';
    swarmEngine.reportIncident({
      lat: baseLocation.lat + 0.0003,
      lng: baseLocation.lng - 0.0002,
      category: 'ROBBERY',
      note: 'Vi a los sujetos escapar hacia la avenida principal.',
      userId: c2Id
    });

    return true;
  }

  /**
   * Scenario 3: Lone false alarm (single unconfirmed trigger)
   */
  runFalseAlarmScenario(baseLocation = { lat: 19.4280, lng: -99.1380 }) {
    sounds.playClick();
    const c1Id = 'sim_citizen_troll';
    swarmEngine.reportIncident({
      lat: baseLocation.lat,
      lng: baseLocation.lng,
      category: 'SUSPICIOUS',
      note: 'Alarma de prueba no verificada.',
      userId: c1Id
    });
  }

  /**
   * Reset all active incidents and reset to clean state
   */
  resetAll() {
    localStorage.removeItem(swarmEngine.STORAGE_KEY_INCIDENTS);
    localStorage.removeItem(swarmEngine.STORAGE_KEY_HISTORY);
    swarmEngine.incidents = [];
    swarmEngine.history = swarmEngine.getInitialHistoricalSeed();
    swarmEngine.saveHistory();
    syncBus.emit('INCIDENT_MUTATION', { action: 'RESET' });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const simulator = new SwarmSimulator();
