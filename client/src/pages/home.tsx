import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchHero from "@/components/search-hero";
import ProviderGrid from "@/components/provider-grid";
import BookingModal from "@/components/booking-modal";
import ProviderProfileModal from "@/components/provider-profile-modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Service {
  id: string;
  code: string;
  displayName: string;
  defaultPrice: string;
  defaultUnit: string;
}

interface Provider {
  id: string;
  displayName: string;
  lat: number;
  lon: number;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  about: string;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    description?: string;
    service: Service;
  }>;
  distance: number;
}

export default function Home() {
  const [searchResults, setSearchResults] = useState<Provider[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  const { data: services = [], isLoading: servicesLoading } = useQuery<Service[]>({
    queryKey: ["/api/services"],
  });

  const handleSearch = async (lat: number, lon: number, serviceId: string) => {
    setIsSearching(true);
    try {
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lat,
          lon,
          service_id: serviceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Search failed");
      }

      const providers = await response.json();
      setSearchResults(providers);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleBookService = (provider: Provider, service: Service) => {
    setSelectedProvider(provider);
    setSelectedService(service);
    setShowBookingModal(true);
  };

  const handleViewProfile = (provider: Provider) => {
    setSelectedProvider(provider);
    setShowProfileModal(true);
  };

  const handleBookingSuccess = () => {
    setShowBookingModal(false);
    setSelectedProvider(null);
    setSelectedService(null);
  };

  return (
    <div className="min-h-screen bg-neutral">
      {/* Header */}
      <header className="bg-white shadow-material-1 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-tools text-white text-lg"></i>
              </div>
              <span className="text-xl font-semibold text-text-primary">ServiceHub</span>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">Services</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">How it works</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-colors">Support</a>
              <Button className="bg-primary text-white hover:bg-blue-700">
                Sign In
              </Button>
            </nav>
            
            <Button variant="ghost" className="md:hidden text-text-primary">
              <i className="fas fa-bars text-xl"></i>
            </Button>
          </div>
        </div>
      </header>

      {/* Search Hero */}
      <SearchHero 
        services={services}
        onSearch={handleSearch}
        isSearching={isSearching}
        servicesLoading={servicesLoading}
      />

      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-semibold text-text-primary">Available Providers</h2>
                <p className="text-text-secondary mt-1">Showing {searchResults.length} providers near you</p>
              </div>
              
              <div className="flex items-center space-x-4">
                <label className="text-sm text-text-secondary">Sort by:</label>
                <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary">
                  <option>Distance</option>
                  <option>Rating</option>
                  <option>Price</option>
                </select>
              </div>
            </div>

            <ProviderGrid 
              providers={searchResults}
              onBookService={handleBookService}
              onViewProfile={handleViewProfile}
            />
          </div>
        </section>
      )}

      {/* Loading state for search */}
      {isSearching && (
        <div className="fixed inset-0 bg-white bg-opacity-90 z-50 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="animate-spin h-12 w-12 text-primary mx-auto mb-4" />
            <p className="text-text-secondary">Finding providers near you...</p>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal 
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        provider={selectedProvider}
        service={selectedService}
        onSuccess={handleBookingSuccess}
      />

      {/* Provider Profile Modal */}
      <ProviderProfileModal 
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        provider={selectedProvider}
        onBookService={handleBookService}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <i className="fas fa-tools text-white text-lg"></i>
                </div>
                <span className="text-xl font-semibold text-text-primary">ServiceHub</span>
              </div>
              <p className="text-text-secondary text-sm leading-relaxed max-w-md">
                Connect with trusted local service providers for all your home and business needs. 
                Quality service, verified professionals, transparent pricing.
              </p>
            </div>
            
            <div>
              <h6 className="font-semibold text-text-primary mb-4">Services</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Home Cleaning</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Plumbing</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Electrical</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Painting</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Gardening</a></li>
              </ul>
            </div>
            
            <div>
              <h6 className="font-semibold text-text-primary mb-4">Support</h6>
              <ul className="space-y-2 text-sm">
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Help Center</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Contact Us</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-text-secondary hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-text-secondary text-sm">© 2024 ServiceHub. All rights reserved.</p>
              <div className="flex space-x-4 mt-4 md:mt-0">
                <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                  <i className="fab fa-facebook text-lg"></i>
                </a>
                <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                  <i className="fab fa-twitter text-lg"></i>
                </a>
                <a href="#" className="text-text-secondary hover:text-primary transition-colors">
                  <i className="fab fa-instagram text-lg"></i>
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
