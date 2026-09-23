import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '@/components/map/MapView';
import ReportCard from '@/components/reports/ReportCard';
import Icon from '@/components/ui/Icon';
import { supabase, getIncidents, getPublicIncidentById, findNearbyIncidents } from '@/lib/supabase';
import { INCIDENT_CATEGORIES, STATUS_LABELS, NOMINATIM_URL, NOMINATIM_LIMIT, formatCategory } from '@/lib/constants';
import { computeScore } from '@/lib/utils';
import type { Incident, Profile, SearchResult, NearbyIncident } from '@/types';

interface HomePageProps {
  profile: Profile | null;
}

function HomePage({ profile }: HomePageProps) {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [showIncidentList, setShowIncidentList] = useState(false);
  const [listOpen, setListOpen] = useState(true);
  const [destination, setDestination] = useState<{ lat: number; lng: number; display_name: string } | null>(null);
  const [destIncidents, setDestIncidents] = useState<NearbyIncident[]>([]);
  const [destLoading, setDestLoading] = useState(false);
  const [showDestList, setShowDestList] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadIncidents();
  }, []);

  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => searchAddress(searchQuery), 300);
      return () => clearTimeout(timer);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  useEffect(() => {
    const channel = supabase
      .channel('incidents-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'incidents' }, (payload) => {
        const id = (payload.new as Incident).id;
        if (id) handleRealtimeIncident(id);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'incidents' }, (payload) => {
        const id = (payload.new as Incident).id;
        if (id) handleRealtimeIncident(id);
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'incidents' }, (payload) => {
        const old = payload.old as Incident;
        if (old?.id) setIncidents(prev => prev.filter(i => i.id !== old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function loadIncidents() {
    const { data } = await getIncidents({ limit: 100 });
    if (data) setIncidents(data);
  }

  async function handleRealtimeIncident(id: string) {
    const { data } = await getPublicIncidentById(id);
    if (data) {
      setIncidents(prev => {
        const exists = prev.some(i => i.id === id);
        return exists ? prev.map(i => (i.id === id ? data : i)) : [data, ...prev];
      });
    } else {
      setIncidents(prev => prev.filter(i => i.id !== id));
    }
  }

  async function searchAddress(query: string) {
    try {
      const response = await fetch(`${NOMINATIM_URL}?q=${encodeURIComponent(query)}&format=json&limit=${NOMINATIM_LIMIT}&countrycodes=cl`);
      const data = await response.json();
      setSearchResults(data);
    } catch (error) {
      console.error('Error searching address:', error);
    }
  }

  function handleSelectResult(result: SearchResult) {
    setSearchQuery(result.display_name);
    setSearchResults([]);
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);
    setDestination({ lat, lng, display_name: result.display_name });
    setShowIncidentList(false);
    setShowDestList(true);
    loadNearby(lat, lng);
  }

  async function loadNearby(lat: number, lng: number) {
    setDestLoading(true);
    const { data } = await findNearbyIncidents(lat, lng, undefined, 250);
    setDestIncidents(data || []);
    setDestLoading(false);
  }

  function closeDestPanel() {
    setDestination(null);
    setDestIncidents([]);
    setShowDestList(false);
  }

  function handleOpenNearby(n: NearbyIncident) {
    setShowDestList(false);
    navigate(`/incident/${n.id}`);
  }

  function handleOpenDetail(incident: Incident) {
    if (window.innerWidth < 768) {
      setShowIncidentList(false);
    }
    navigate(`/incident/${incident.id}`);
  }

  const filteredIncidents = incidents.filter(i => {
    if (selectedCategory && i.category !== selectedCategory) return false;
    if (selectedStatus && i.status !== selectedStatus) return false;
    return true;
  });

  const filterPanel = (
    <>
      <div className="p-3 border-b border-outline-variant">
        <div className="relative">
          <Icon name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" size={16} />
          <input
            type="text"
            placeholder="Buscar dirección..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-lg bg-surface-container-lowest border border-outline-variant text-sm focus:outline-none focus:border-primary"
          />
          {searchResults.length > 0 && (
            <div className="mt-2 border border-outline-variant rounded-lg overflow-hidden bg-surface-container-lowest absolute z-10 w-full">
              {searchResults.map(result => (
                <button
                  key={result.place_id}
                  onClick={() => handleSelectResult(result)}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-surface-container transition"
                >
                  {result.display_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 border-b border-outline-variant space-y-2">
        <p className="text-label-sm text-on-surface-variant/60">Tipo de incidencia</p>
        <div className="flex flex-wrap gap-2">
          <ChipRow
            label="Todas"
            active={selectedCategory === null}
            onClick={() => setSelectedCategory(null)}
          />
          {INCIDENT_CATEGORIES.map(cat => (
            <ChipRow
              key={cat.value}
              label={cat.label}
              active={selectedCategory === cat.value}
              onClick={() => setSelectedCategory(selectedCategory === cat.value ? null : cat.value)}
            />
          ))}
        </div>
      </div>

      <div className="p-3 border-b border-outline-variant space-y-2">
        <p className="text-label-sm text-on-surface-variant/60">Estado</p>
        <div className="flex flex-wrap gap-2">
          <ChipRow
            label="Todos"
            active={selectedStatus === null}
            onClick={() => setSelectedStatus(null)}
          />
          {Object.entries(STATUS_LABELS).map(([key, label]) => (
            <ChipRow
              key={key}
              label={label}
              active={selectedStatus === key}
              onClick={() => setSelectedStatus(selectedStatus === key ? null : key)}
            />
          ))}
        </div>
      </div>
    </>
  );

  const incidentList = (
    <div className="p-3">
      <h3 className="text-label-md font-semibold text-on-surface mb-3">
        Reportes recientes ({filteredIncidents.length})
      </h3>
      <div className="space-y-3">
        {filteredIncidents.map(incident => (
          <ReportCard
            key={incident.id}
            incident={incident}
            selected={selectedIncident?.id === incident.id}
            onSelect={(inc) => { setSelectedIncident(inc); handleOpenDetail(inc); }}
          />
        ))}
        {filteredIncidents.length === 0 && (
          <p className="text-label-sm text-on-surface-variant text-center py-8">No hay incidencias que coincidan</p>
        )}
      </div>
    </div>
  );

  const destItems = (
    <div className="p-3 space-y-2">
      {destLoading ? (
        <div className="flex items-center gap-2 text-label-sm text-on-surface-variant py-4 justify-center">
          <span className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent"></span>
          Buscando reportes...
        </div>
      ) : destIncidents.length === 0 ? (
        <p className="text-label-sm text-on-surface-variant text-center py-8">No hay reportes cerca de este lugar</p>
      ) : (
        destIncidents.map(n => (
          <div
            key={n.id}
            onClick={() => handleOpenNearby(n)}
            className="bg-surface-container-lowest border border-outline-variant rounded-lg p-3 cursor-pointer hover:bg-surface-container-low transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-label-md font-semibold text-on-surface">{formatCategory(n.category)}</h4>
              <span className="shrink-0 text-label-sm text-on-surface-variant">{Math.round(n.distance_m)} m</span>
            </div>
            <p className="text-label-sm text-on-surface-variant mt-1 line-clamp-2">{n.description}</p>
            <div className="flex items-center gap-2 mt-2 text-label-sm text-on-surface-variant">
              <span className="inline-flex items-center gap-1"><Icon name="thumbs-up" size={13} /> {n.votes_up}</span>
              <span>·</span>
              <span>Score {computeScore(n.votes_up, n.votes_down)}</span>
              {n.place_name && <><span>·</span><span className="truncate">{n.place_name}</span></>}
            </div>
          </div>
        ))
      )}
    </div>
  );

  const destHeader = (
    <div className="px-4 py-3 border-b border-outline-variant flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-label-md font-semibold text-on-surface">Reportes cercanos</p>
        <p className="text-label-sm text-on-surface-variant truncate">{destination?.display_name}</p>
      </div>
      <button onClick={closeDestPanel} className="p-1.5 rounded-full hover:bg-surface-container">
        <Icon name="close" />
      </button>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 flex overflow-hidden">
        <div
          className={`hidden lg:flex flex-col shrink-0 bg-surface-container-lowest border-r border-outline-variant overflow-hidden transition-all duration-300 ease-in-out ${
            listOpen ? 'w-96' : 'w-0 border-r-0'
          }`}
        >
          <div className="w-96 flex flex-col h-full">
            {filterPanel}
            <div className="flex-1 overflow-y-auto">
              {incidentList}
            </div>
          </div>
        </div>

        <div className="flex-1 relative">
          <MapView
            incidents={filteredIncidents}
            selectedIncident={selectedIncident}
            showLocationControls
            focus={destination ? { lat: destination.lat, lng: destination.lng, zoom: 16 } : null}
            onIncidentClick={(inc) => { setSelectedIncident(inc); handleOpenDetail(inc); }}
          />

          {destination && (
            <div className="absolute top-20 left-4 z-[1000] hidden lg:flex flex-col w-80 max-h-[70vh] bg-surface-container-lowest rounded-xl shadow-elevation-soft overflow-hidden">
              {destHeader}
              <div className="flex-1 overflow-y-auto">{destItems}</div>
            </div>
          )}

          {destination && (
            <button
              onClick={() => setShowDestList(true)}
              className="absolute top-16 left-20 z-[1000] lg:hidden bg-surface-container-lowest rounded-full shadow-elevation-soft hover:shadow-elevation-hover transition-all flex items-center gap-2 px-3 py-1.5 text-label-sm font-semibold text-on-surface max-w-[70%]"
            >
              <Icon name="locate" className="text-primary" size={14} />
              <span className="truncate">{destIncidents.length} cerca</span>
            </button>
          )}

          <div className="absolute top-4 right-4 z-[1000] hidden lg:flex">
            <button
              onClick={() => setListOpen(o => !o)}
              className="bg-surface-container-lowest rounded-full shadow-elevation-soft hover:shadow-elevation-hover transition-all inline-flex items-center gap-1.5 px-5 py-1.5 text-sm font-semibold text-on-surface"
              title={listOpen ? 'Cerrar panel de reportes' : 'Abrir panel de reportes'}
            >
              <Icon name="search" className="text-primary" size={16} />
              <span>{listOpen ? 'Ocultar' : 'Reportes'}</span>
            </button>
          </div>

          <div className="absolute top-4 left-4 z-[1000] flex lg:hidden">
            <button
              onClick={() => setShowIncidentList(true)}
              className="bg-surface-container-lowest rounded-full shadow-elevation-soft hover:shadow-elevation-hover transition-all flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-on-surface"
            >
              <Icon name="locate" className="text-primary" size={18} />
              <span>{filteredIncidents.length}</span>
            </button>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex bg-surface-container-lowest border-t border-outline-variant px-4 py-2 items-center justify-center gap-6 text-label-sm text-on-surface-variant">
        <span><strong>{filteredIncidents.length}</strong> activas</span>
        <span>·</span>
        <span>{incidents.filter(i => i.status === 'resuelto').length} resueltas</span>
        <span>·</span>
        <span>{new Set(incidents.map(i => i.category)).size} categorías</span>
      </div>

      {showIncidentList && (
        <div className="fixed inset-0 z-[2000] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowIncidentList(false)} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant px-4 py-3 flex items-center justify-between rounded-t-2xl">
              <h3 className="font-semibold text-on-surface">Reportes recientes ({filteredIncidents.length})</h3>
              <button onClick={() => setShowIncidentList(false)} className="p-1.5 rounded-full hover:bg-surface-container">
                <Icon name="close" />
              </button>
            </div>
            <div className="px-4 pt-3">{filterPanel}</div>
            <div className="flex-1 overflow-y-auto">{incidentList}</div>
          </div>
        </div>
      )}

      {destination && showDestList && (
        <div className="fixed inset-0 z-[2000] lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={closeDestPanel} />
          <div className="absolute bottom-0 left-0 right-0 bg-surface-container-lowest rounded-t-2xl max-h-[85vh] flex flex-col">
            <div className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant rounded-t-2xl">
              {destHeader}
            </div>
            <div className="flex-1 overflow-y-auto">{destItems}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function ChipRow({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-label-sm font-semibold transition-colors ${
        active ? 'bg-secondary-container text-secondary' : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
      }`}
    >
      {label}
    </button>
  );
}

export default HomePage;
