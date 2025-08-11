
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapPin, Search, Loader2, Sparkles, Star, Users, Award } from "lucide-react";
import type { Service } from "@shared/schema";

interface SearchHeroProps {
  services: Service[];
  onSearch: (lat: number, lon: number, serviceId: string) => void;
  isSearching: boolean;
  servicesLoading: boolean;
}

export default function SearchHero({ services, onSearch, isSearching, servicesLoading }: SearchHeroProps) {
  const [location, setLocation] = useState("");
  const [selectedService, setSelectedService] = useState("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const handleLocationClick = () => {
    setIsGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation("Current Location");
          setIsGettingLocation(false);
        },
        (error) => {
          console.error("Error getting location:", error);
          setIsGettingLocation(false);
        }
      );
    } else {
      console.error("Geolocation is not supported by this browser.");
      setIsGettingLocation(false);
    }
  };

  const handleSearch = () => {
    if (!selectedService) return;

    if (location === "Current Location" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onSearch(position.coords.latitude, position.coords.longitude, selectedService);
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      // For demo purposes, use a default location
      onSearch(40.7128, -74.0060, selectedService);
    }
  };

  return (
    <section className="relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 animated-bg"></div>
      
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-transparent to-blue-900/20"></div>
      
      {/* Floating Elements */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-white/10 rounded-full blur-3xl animate-pulse" style={{animationDelay: '4s'}}></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="text-center mb-16 fade-in">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm rounded-full px-6 py-3 text-sm font-bold mb-8 border border-white/20 hover-lift">
            <Star className="text-yellow-300 fill-current" size={16} />
            <span className="text-white">Trusted by 10,000+ customers</span>
          </div>
          
          {/* Main Heading */}
          <h1 className="text-6xl md:text-8xl font-bold mb-8 leading-tight">
            Find <span className="text-transparent bg-gradient-to-r from-yellow-300 via-orange-300 to-red-300 bg-clip-text">Expert</span>
            <br />Service <span className="text-transparent bg-gradient-to-r from-blue-300 via-purple-300 to-pink-300 bg-clip-text">Providers</span>
          </h1>
          
          {/* Subtitle */}
          <p className="text-xl md:text-2xl mb-10 text-white/90 max-w-4xl mx-auto font-light leading-relaxed">
            Connect with verified professionals near you for home services, repairs, and maintenance with guaranteed quality
          </p>
          
          {/* Trust Indicators */}
          <div className="flex justify-center items-center space-x-8 mb-12">
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Users className="text-white" size={18} />
              <span className="text-white font-semibold">500+ Providers</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Award className="text-white" size={18} />
              <span className="text-white font-semibold">100% Verified</span>
            </div>
            <div className="flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2">
              <Star className="text-white fill-current" size={18} />
              <span className="text-white font-semibold">4.9★ Rating</span>
            </div>
          </div>
        </div>

        {/* Search Form */}
        <div className="max-w-4xl mx-auto slide-up">
          <div className="glass-card rounded-3xl p-8 md:p-12 shadow-2xl hover-lift">
            <div className="flex flex-col lg:flex-row gap-6 items-end">
              {/* Location Input */}
              <div className="flex-1">
                <label className="form-label text-gray-800 mb-3 block">
                  <MapPin className="inline mr-2" size={16} />
                  Your Location
                </label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Enter your address or postal code"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="form-input text-lg h-14 pr-32"
                  />
                  <Button
                    type="button"
                    onClick={handleLocationClick}
                    disabled={isGettingLocation}
                    className="absolute right-2 top-2 h-10 px-4 bg-purple-100 text-purple-700 hover:bg-purple-200 text-sm font-semibold rounded-lg transition-all"
                  >
                    {isGettingLocation ? (
                      <Loader2 className="animate-spin" size={16} />
                    ) : (
                      <>
                        <MapPin size={16} className="mr-1" />
                        Use Current
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Service Selection */}
              <div className="flex-1">
                <label className="form-label text-gray-800 mb-3 block">
                  <Sparkles className="inline mr-2" size={16} />
                  Service Needed
                </label>
                <Select value={selectedService} onValueChange={setSelectedService}>
                  <SelectTrigger className="form-input text-lg h-14">
                    <SelectValue placeholder="What service do you need?" />
                  </SelectTrigger>
                  <SelectContent>
                    {servicesLoading ? (
                      <SelectItem value="loading" disabled>
                        <div className="flex items-center gap-2">
                          <Loader2 className="animate-spin" size={16} />
                          Loading services...
                        </div>
                      </SelectItem>
                    ) : (
                      services.map((service) => (
                        <SelectItem key={service.id} value={service.id} className="text-lg py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gradient-primary rounded-lg flex items-center justify-center">
                              <i className={`fas ${
                                service.displayName.includes('Cleaning') ? 'fa-spray-can' :
                                service.displayName.includes('Plumbing') ? 'fa-wrench' :
                                service.displayName.includes('Electrical') ? 'fa-bolt' :
                                service.displayName.includes('Painting') ? 'fa-paint-roller' :
                                'fa-cog'
                              } text-white text-sm`}></i>
                            </div>
                            {service.displayName}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <div className="lg:w-auto w-full">
                <Button
                  onClick={handleSearch}
                  disabled={!selectedService || !location || isSearching}
                  className="btn-neon w-full lg:w-auto h-14 px-8 text-lg font-bold"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="animate-spin mr-2" size={20} />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2" size={20} />
                      Find Providers
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Popular Searches */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-gray-600 font-semibold mb-4">Popular searches:</p>
              <div className="flex flex-wrap gap-3">
                {["House Cleaning", "Plumbing Repair", "Electrical Work", "Painting", "Garden Maintenance"].map((search) => (
                  <button
                    key={search}
                    onClick={() => {
                      const service = services.find(s => s.displayName.toLowerCase().includes(search.toLowerCase().split(' ')[0]));
                      if (service) setSelectedService(service.id);
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-purple-100 text-gray-700 hover:text-purple-700 rounded-full text-sm font-medium transition-all hover-lift"
                  >
                    {search}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Stats */}
        <div className="mt-16 text-center">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="text-white/90">
              <div className="text-3xl font-bold text-yellow-300 mb-2">2 mins</div>
              <div className="text-lg">Average Response Time</div>
            </div>
            <div className="text-white/90">
              <div className="text-3xl font-bold text-green-300 mb-2">24/7</div>
              <div className="text-lg">Customer Support</div>
            </div>
            <div className="text-white/90">
              <div className="text-3xl font-bold text-blue-300 mb-2">100%</div>
              <div className="text-lg">Satisfaction Guarantee</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
