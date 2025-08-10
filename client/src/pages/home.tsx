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
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-glass shadow-soft sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-4 fade-in">
              <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                <i className="fas fa-tools text-white text-xl"></i>
              </div>
              <div>
                <span className="text-2xl font-bold text-text-primary">ServiceHub</span>
                <p className="text-sm text-text-secondary font-medium">Professional Services</p>
              </div>
            </div>
            
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 font-medium hover:scale-105">Services</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 font-medium hover:scale-105">How it works</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 font-medium hover:scale-105">For Providers</a>
              <a href="#" className="text-text-secondary hover:text-primary transition-all duration-300 font-medium hover:scale-105">Support</a>
              <div className="flex items-center space-x-3">
                <Button variant="ghost" className="text-text-primary hover:text-primary font-medium">
                  Sign In
                </Button>
                <Button className="btn-gradient px-6 py-2 rounded-xl font-semibold">
                  Get Started
                </Button>
              </div>
            </nav>
            
            <Button variant="ghost" className="lg:hidden text-text-primary hover:bg-white/50">
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

      {/* Features Section */}
      {searchResults.length === 0 && (
        <section className="py-20 bg-white/50 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16 fade-in">
              <h2 className="text-4xl font-bold text-text-primary mb-4">
                Why Choose ServiceHub?
              </h2>
              <p className="text-xl text-text-secondary max-w-3xl mx-auto font-light">
                Experience seamless service booking with verified professionals, transparent pricing, and guaranteed satisfaction
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
              <div className="text-center group slide-up">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-soft group-hover:shadow-large transition-all duration-300 group-hover:scale-110">
                  <i className="fas fa-shield-check text-3xl text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Verified Professionals</h3>
                <p className="text-slate-600 leading-relaxed">
                  All our service providers are thoroughly vetted, background-checked, and verified for your peace of mind.
                </p>
              </div>

              <div className="text-center group slide-up" style={{animationDelay: '0.2s'}}>
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-soft group-hover:shadow-large transition-all duration-300 group-hover:scale-110">
                  <i className="fas fa-clock text-3xl text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Quick Response</h3>
                <p className="text-slate-600 leading-relaxed">
                  Get instant quotes and same-day service availability. Most bookings are confirmed within minutes.
                </p>
              </div>

              <div className="text-center group slide-up" style={{animationDelay: '0.4s'}}>
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-soft group-hover:shadow-large transition-all duration-300 group-hover:scale-110">
                  <i className="fas fa-star text-3xl text-white"></i>
                </div>
                <h3 className="text-2xl font-bold text-slate-800 mb-3">Quality Guaranteed</h3>
                <p className="text-slate-600 leading-relaxed">
                  100% satisfaction guarantee with transparent pricing and quality workmanship on every service.
                </p>
              </div>
            </div>

            {/* Service Categories */}
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-text-primary mb-8">Popular Services</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {services?.slice(0, 5).map((service, index) => {
                  const colors = [
                    'from-blue-500 to-cyan-600',
                    'from-emerald-500 to-teal-600', 
                    'from-amber-500 to-orange-600',
                    'from-purple-500 to-violet-600',
                    'from-rose-500 to-pink-600'
                  ];
                  return (
                    <div key={service.id} className="glass-card rounded-2xl p-6 text-center hover-lift group cursor-pointer">
                      <div className={`w-16 h-16 bg-gradient-to-br ${colors[index]} rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 shadow-soft`}>
                        <i className={`fas ${
                          service.displayName.includes('Cleaning') ? 'fa-spray-can' :
                          service.displayName.includes('Plumbing') ? 'fa-wrench' :
                          service.displayName.includes('Electrical') ? 'fa-bolt' :
                          service.displayName.includes('Painting') ? 'fa-paint-roller' :
                          'fa-leaf'
                        } text-2xl text-white`}></i>
                      </div>
                      <h4 className="font-bold text-slate-800 group-hover:text-indigo-600 transition-colors">
                        {service.displayName}
                      </h4>
                    </div>
                  )
                }) || []}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <section className="py-16 slide-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-10">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-3xl font-bold text-text-primary mb-2">
                  Available Providers
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-gradient-primary rounded-full animate-pulse"></div>
                  <p className="text-text-secondary font-medium">
                    Found {searchResults.length} trusted professionals near you
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-4 glass-card px-4 py-3 rounded-xl">
                <i className="fas fa-sort text-text-secondary"></i>
                <label className="text-sm font-medium text-text-secondary">Sort by:</label>
                <select className="bg-transparent border-none text-sm font-medium text-text-primary focus:outline-none cursor-pointer">
                  <option>Distance</option>
                  <option>Rating</option>
                  <option>Price</option>
                  <option>Reviews</option>
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
      <footer className="bg-gradient-to-r from-slate-900 to-gray-800 text-white mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-12 h-12 bg-gradient-primary rounded-xl flex items-center justify-center shadow-soft">
                  <i className="fas fa-tools text-white text-xl"></i>
                </div>
                <div>
                  <span className="text-2xl font-bold">ServiceHub</span>
                  <p className="text-gray-300 text-sm">Professional Services</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-md mb-6">
                Connect with trusted local service providers for all your home and business needs. 
                Experience quality service, verified professionals, and transparent pricing.
              </p>
              <div className="flex items-center space-x-6">
                <div className="flex items-center space-x-2">
                  <i className="fas fa-users text-blue-400"></i>
                  <span className="text-sm text-gray-300">10,000+ Customers</span>
                </div>
                <div className="flex items-center space-x-2">
                  <i className="fas fa-star text-yellow-400"></i>
                  <span className="text-sm text-gray-300">4.9/5 Rating</span>
                </div>
              </div>
            </div>
            
            <div>
              <h6 className="font-bold text-white mb-6 text-lg">Popular Services</h6>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                    <i className="fas fa-spray-can text-blue-400 group-hover:text-blue-300 transition-colors"></i>
                    Home Cleaning
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                    <i className="fas fa-wrench text-green-400 group-hover:text-green-300 transition-colors"></i>
                    Plumbing Services
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                    <i className="fas fa-bolt text-yellow-400 group-hover:text-yellow-300 transition-colors"></i>
                    Electrical Work
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                    <i className="fas fa-paint-roller text-purple-400 group-hover:text-purple-300 transition-colors"></i>
                    Painting & Decor
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2 group">
                    <i className="fas fa-leaf text-emerald-400 group-hover:text-emerald-300 transition-colors"></i>
                    Garden Services
                  </a>
                </li>
              </ul>
            </div>
            
            <div>
              <h6 className="font-bold text-white mb-6 text-lg">Support & Legal</h6>
              <ul className="space-y-3">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <i className="fas fa-question-circle text-blue-400"></i>
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <i className="fas fa-headset text-green-400"></i>
                    Contact Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <i className="fas fa-file-contract text-orange-400"></i>
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <i className="fas fa-shield-alt text-purple-400"></i>
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-2">
                    <i className="fas fa-user-tie text-indigo-400"></i>
                    Become a Provider
                  </a>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8">
            <div className="flex flex-col lg:flex-row justify-between items-center">
              <div className="flex flex-col lg:flex-row items-center gap-4 mb-6 lg:mb-0">
                <p className="text-gray-400">© 2024 ServiceHub. All rights reserved.</p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>Made with</span>
                  <i className="fas fa-heart text-red-400"></i>
                  <span>for better services</span>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <span className="text-gray-400 text-sm font-medium">Follow us:</span>
                <div className="flex space-x-4">
                  <a href="#" className="w-10 h-10 bg-blue-600 hover:bg-blue-700 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-facebook-f text-white"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-blue-400 hover:bg-blue-500 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-twitter text-white"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-instagram text-white"></i>
                  </a>
                  <a href="#" className="w-10 h-10 bg-green-600 hover:bg-green-700 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-whatsapp text-white"></i>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
