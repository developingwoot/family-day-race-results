import { Injectable, inject, signal, OnDestroy } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  Timestamp
} from '@angular/fire/firestore';

export interface SiteDocument {
  id: string;
  name: string;
  createdAt: Timestamp;
}

// NOTE: The initial sites (Fishkill, Patterson, San Juan, Wallkill, Warwick) must be
// seeded into the 'sites' Firestore collection before they will appear in the app.
@Injectable({
  providedIn: 'root'
})
export class SitesService {
  private firestore = inject(Firestore);

  private _sites = signal<SiteDocument[]>([]);
  readonly sites = this._sites.asReadonly();

  readonly availableSites = signal<string[]>([]);

  private unsubscribe?: () => void;

  constructor() {
    const sitesCollection = collection(this.firestore, 'sites');
    const sitesQuery = query(sitesCollection, orderBy('name', 'asc'));

    this.unsubscribe = onSnapshot(sitesQuery, snapshot => {
      const docs = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })) as SiteDocument[];
      this._sites.set(docs);
      this.availableSites.set(docs.map(d => d.name));
    }, error => {
      console.error('Error loading sites:', error);
    });
  }

  async addSite(name: string): Promise<void> {
    const trimmed = name.trim();
    if (!trimmed) throw new Error('Site name cannot be empty');

    const duplicate = this._sites().some(s => s.name.toLowerCase() === trimmed.toLowerCase());
    if (duplicate) throw new Error(`Site "${trimmed}" already exists`);

    const sitesCollection = collection(this.firestore, 'sites');
    await addDoc(sitesCollection, { name: trimmed, createdAt: Timestamp.now() });
  }

  async removeSite(id: string): Promise<void> {
    const siteDoc = doc(this.firestore, 'sites', id);
    await deleteDoc(siteDoc);
  }

  ngOnDestroy(): void {
    this.unsubscribe?.();
  }
}
