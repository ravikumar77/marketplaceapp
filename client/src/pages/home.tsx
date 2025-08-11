
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import SearchHero from "@/components/search-hero";
import ProviderGrid from "@/components/provider-grid";
import BookingModal from "@/components/booking-modal";
import ProviderProfileModal from "@/components/provider-profile-modal";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Phone, Mail, Calendar, Users, CheckCircle, ArrowRight, Search, MapPin, Sparkles, User, LogOut, Shield, Clock, Award, Zap, Globe, HeadphonesIcon } from "lucide-react";
import { AuthModal } from "@/components/auth-modal";
import { useAuth } from "@/hooks/use-auth";
import type { Provider, Service } from "@shared/schema";

export default function Home() {
  const [searchResults, setSearchResults] = useState<Provider[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const { user, isAuthenticated, login, logout, isLoading: authLoading } = useAuth();

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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Search failed with status ${response.status}`);
      }

      const providers = await response.json();
      console.log('Search results:', providers);
      setSearchResults(providers || []);

      if (providers.length === 0) {
        console.log('No providers found for the selected criteria');
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResults([]);
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
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-cyan-400/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-yellow-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>

      {/* Header */}
      <header className="relative z-50 bg-white/80 backdrop-blur-lg border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <div className="flex items-center space-x-4 fade-in">
              <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg hover-lift">
                <Zap className="text-white text-xl" />
              </div>
              <div>
                <span className="text-3xl font-bold text-gradient">ServiceHub</span>
                <p className="text-sm text-gray-600 font-medium">Professional Services</p>
              </div>
            </div>

            {/* Navigation */}
            <nav className="hidden lg:flex items-center space-x-8">
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-semibold hover:scale-105 interactive-element">Services</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-semibold hover:scale-105 interactive-element">How it works</a>
              <a href="/bookings" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-semibold hover:scale-105 interactive-element">My Bookings</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-semibold hover:scale-105 interactive-element">For Providers</a>
              <a href="#" className="text-gray-700 hover:text-purple-600 transition-all duration-300 font-semibold hover:scale-105 interactive-element">Support</a>

              {!authLoading && (
                <div className="flex items-center space-x-4">
                  {isAuthenticated ? (
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2 bg-white/60 backdrop-blur-sm rounded-full px-4 py-2 border border-white/30">
                        <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <span className="text-gray-800 font-semibold">{user?.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={logout}
                        className="flex items-center space-x-2 hover-lift bg-white/60 backdrop-blur-sm border-white/30"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>Logout</span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => setShowAuthModal(true)}
                      className="btn-neon"
                    >
                      Sign In
                    </Button>
                  )}
                </div>
              )}
            </nav>

            {/* Mobile Menu Button */}
            <Button variant="ghost" className="lg:hidden text-gray-800 hover:bg-white/50">
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
        <section className="py-24 relative">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Section Header */}
            <div className="text-center mb-20 fade-in">
              <div className="inline-flex items-center gap-2 bg-purple-100 rounded-full px-6 py-3 text-sm font-semibold mb-8 border border-purple-200">
                <Sparkles className="text-purple-600" size={16} />
                <span className="text-purple-800">Premium Experience</span>
              </div>
              <h2 className="text-5xl font-bold text-gray-900 mb-6">
                Why Choose <span className="text-gradient">ServiceHub</span>?
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
                Experience seamless service booking with verified professionals, transparent pricing, and guaranteed satisfaction
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
              <div className="futuristic-card p-8 text-center group hover-lift">
                <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Shield className="text-3xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Verified Professionals</h3>
                <p className="text-gray-600 leading-relaxed">
                  All our service providers are thoroughly vetted, background-checked, and verified for your peace of mind.
                </p>
                <div className="mt-6">
                  <span className="badge-primary">100% Verified</span>
                </div>
              </div>

              <div className="futuristic-card p-8 text-center group hover-lift" style={{animationDelay: '0.2s'}}>
                <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Clock className="text-3xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Lightning Fast</h3>
                <p className="text-gray-600 leading-relaxed">
                  Get instant quotes and same-day service availability. Most bookings are confirmed within minutes.
                </p>
                <div className="mt-6">
                  <span className="badge-success">Instant Response</span>
                </div>
              </div>

              <div className="futuristic-card p-8 text-center group hover-lift" style={{animationDelay: '0.4s'}}>
                <div className="w-20 h-20 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110">
                  <Award className="text-3xl text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Quality Guaranteed</h3>
                <p className="text-gray-600 leading-relaxed">
                  100% satisfaction guarantee with transparent pricing and quality workmanship on every service.
                </p>
                <div className="mt-6">
                  <span className="badge-primary">Money Back</span>
                </div>
              </div>
            </div>

            {/* Stats Section */}
            <div className="glass-card rounded-3xl p-12 mb-20 slide-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">10,000+</div>
                  <div className="text-gray-600 font-medium">Happy Customers</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">500+</div>
                  <div className="text-gray-600 font-medium">Verified Providers</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">50+</div>
                  <div className="text-gray-600 font-medium">Service Categories</div>
                </div>
                <div className="text-center">
                  <div className="text-4xl font-bold text-gradient mb-2">4.9★</div>
                  <div className="text-gray-600 font-medium">Average Rating</div>
                </div>
              </div>
            </div>

            {/* Service Categories */}
            <div className="text-center mb-12">
              <h3 className="text-4xl font-bold text-gray-900 mb-12">Popular Services</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                {services?.slice(0, 5).map((service, index) => {
                  const gradients = [
                    'from-blue-500 to-cyan-600',
                    'from-emerald-500 to-teal-600',
                    'from-amber-500 to-orange-600',
                    'from-purple-500 to-violet-600',
                    'from-rose-500 to-pink-600'
                  ];
                  const icons = [
                    'fa-spray-can',
                    'fa-wrench',
                    'fa-bolt',
                    'fa-paint-roller',
                    'fa-leaf'
                  ];
                  return (
                    <div key={service.id} className="futuristic-card rounded-2xl p-8 text-center hover-lift group cursor-pointer interactive-element">
                      <div className={`w-16 h-16 bg-gradient-to-br ${gradients[index]} rounded-xl flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg pulse-glow`}>
                        <i className={`fas ${icons[index]} text-2xl text-white`}></i>
                      </div>
                      <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors text-lg">
                        {service.displayName}
                      </h4>
                      <p className="text-gray-500 text-sm mt-2">Professional service</p>
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
        <section className="py-20 slide-up">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-12">
              <div className="mb-6 lg:mb-0">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  Available <span className="text-gradient">Providers</span>
                </h2>
                <div className="flex items-center space-x-3">
                  <div className="status-indicator online"></div>
                  <p className="text-gray-600 font-medium text-lg">
                    Found {searchResults.length} trusted professionals near you
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-4 glass-card px-6 py-4 rounded-xl">
                <i className="fas fa-sort text-gray-600"></i>
                <label className="text-sm font-semibold text-gray-700">Sort by:</label>
                <select className="bg-transparent border-none text-sm font-semibold text-gray-900 focus:outline-none cursor-pointer">
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

      {/* Loading State */}
      {isSearching && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="futuristic-card p-10 rounded-3xl text-center max-w-md mx-4">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-6 pulse-glow">
              <Loader2 className="animate-spin h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-3">Searching for Providers</h3>
            <p className="text-gray-600">Finding the best service providers near you...</p>
          </div>
        </div>
      )}

      {/* No Results */}
      {!isSearching && searchResults.length === 0 && (
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="futuristic-card p-16 rounded-3xl max-w-2xl mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-400 to-gray-600 rounded-full flex items-center justify-center mx-auto mb-8">
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-4">No Providers Found</h3>
              <p className="text-gray-600 mb-8 text-lg leading-relaxed">
                We couldn't find any service providers in your area for the selected service. 
                Try expanding your search radius or selecting a different service.
              </p>
              <Button 
                onClick={() => setSearchResults([])}
                className="btn-gradient px-8 py-4 text-lg"
              >
                Search Again
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      <BookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        provider={selectedProvider}
        service={selectedService}
        onSuccess={handleBookingSuccess}
      />

      <ProviderProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
        provider={selectedProvider}
        onBookService={handleBookService}
      />

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={login}
      />

      {/* Footer */}
      <footer className="bg-gradient-to-r from-gray-900 via-purple-900 to-gray-900 text-white mt-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            <div className="col-span-1 md:col-span-2">
              <div className="flex items-center space-x-4 mb-8">
                <div className="w-14 h-14 bg-gradient-primary rounded-2xl flex items-center justify-center shadow-lg">
                  <Zap className="text-white text-xl" />
                </div>
                <div>
                  <span className="text-3xl font-bold">ServiceHub</span>
                  <p className="text-gray-300 text-sm">Professional Services</p>
                </div>
              </div>
              <p className="text-gray-300 leading-relaxed max-w-md mb-8 text-lg">
                Connect with trusted local service providers for all your home and business needs.
                Experience quality service, verified professionals, and transparent pricing.
              </p>
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-3">
                  <Users className="text-blue-400" />
                  <span className="text-gray-300 font-medium">10,000+ Customers</span>
                </div>
                <div className="flex items-center space-x-3">
                  <Star className="text-yellow-400 fill-current" />
                  <span className="text-gray-300 font-medium">4.9/5 Rating</span>
                </div>
              </div>
            </div>

            <div>
              <h6 className="font-bold text-white mb-8 text-xl">Popular Services</h6>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <i className="fas fa-spray-can text-blue-400 group-hover:text-blue-300 transition-colors"></i>
                    Home Cleaning
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <i className="fas fa-wrench text-green-400 group-hover:text-green-300 transition-colors"></i>
                    Plumbing Services
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <i className="fas fa-bolt text-yellow-400 group-hover:text-yellow-300 transition-colors"></i>
                    Electrical Work
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <i className="fas fa-paint-roller text-purple-400 group-hover:text-purple-300 transition-colors"></i>
                    Painting & Decor
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h6 className="font-bold text-white mb-8 text-xl">Support & Legal</h6>
              <ul className="space-y-4">
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <HeadphonesIcon className="text-blue-400 group-hover:text-blue-300 transition-colors" size={18} />
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <Phone className="text-green-400 group-hover:text-green-300 transition-colors" size={18} />
                    Contact Support
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <Shield className="text-purple-400 group-hover:text-purple-300 transition-colors" size={18} />
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-gray-300 hover:text-white transition-colors flex items-center gap-3 group text-lg">
                    <User className="text-indigo-400 group-hover:text-indigo-300 transition-colors" size={18} />
                    Become a Provider
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-700 pt-10">
            <div className="flex flex-col lg:flex-row justify-between items-center">
              <div className="flex flex-col lg:flex-row items-center gap-6 mb-8 lg:mb-0">
                <p className="text-gray-400 text-lg">© 2024 ServiceHub. All rights reserved.</p>
                <div className="flex items-center gap-4 text-gray-400">
                  <span>Made with</span>
                  <i className="fas fa-heart text-red-400 animate-pulse"></i>
                  <span>for better services</span>
                </div>
              </div>

              <div className="flex items-center space-x-8">
                <span className="text-gray-400 font-semibold">Follow us:</span>
                <div className="flex space-x-4">
                  <a href="#" className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-facebook-f text-white"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-gradient-to-r from-blue-400 to-blue-500 hover:from-blue-500 hover:to-blue-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-twitter text-white"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
                    <i className="fab fa-instagram text-white"></i>
                  </a>
                  <a href="#" className="w-12 h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110">
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
