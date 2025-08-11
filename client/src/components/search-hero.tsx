import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { MapPin, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  code: string;
  displayName: string;
}

interface SearchHeroProps {
  services: Service[];
  onSearch: (lat: number, lon: number, serviceId: string) => void;
  isSearching: boolean;
  servicesLoading: boolean;
}

export default function SearchHero({ services, onSearch, isSearching, servicesLoading }: SearchHeroProps) {
  const [selectedService, setSelectedService] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const { toast } = useToast();

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast({
        title: "Geolocation not supported",
        description: "Your browser doesn't support geolocation.",
        variant: "destructive",
      });
      return;
    }

    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setCurrentLocation({ lat: latitude, lon: longitude });
        setLocation(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        setGettingLocation(false);
        
        toast({
          title: "Location detected",
          description: "Your current location has been set.",
        });
      },
      (error) => {
        setGettingLocation(false);
        toast({
          title: "Location error",
          description: `Error getting location: ${error.message}`,
          variant: "destructive",
        });
      }
    );
  };

  const handleSearch = () => {
    if (!selectedService) {
      toast({
        title: "Service required",
        description: "Please select a service type.",
        variant: "destructive",
      });
      return;
    }

    if (!currentLocation) {
      toast({
        title: "Location required",
        description: "Please allow location access or enter your location manually.",
        variant: "destructive",
      });
      return;
    }

    onSearch(currentLocation.lat, currentLocation.lon, selectedService);
  };

  return (
    <section className="relative bg-gradient-hero text-white py-20 lg:py-28 overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-400/15 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-400/15 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-violet-400/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12 fade-in">
          <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm rounded-full px-6 py-3 text-sm font-semibold mb-8 border border-white/20">
            <i className="fas fa-star text-amber-300"></i>
            <span className="text-white/95">Trusted by 10,000+ customers</span>
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight">
            Find <span className="text-transparent bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300 bg-clip-text">Expert</span>
            <br />Service Providers
          </h1>
          <p className="text-xl md:text-2xl mb-6 text-white/90 max-w-3xl mx-auto font-light leading-relaxed">
            Connect with verified professionals near you for home services, repairs, and maintenance
          </p>
          <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-white/80 mb-12">
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <i className="fas fa-shield-alt text-emerald-400"></i>
              <span className="font-medium">Verified Professionals</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <i className="fas fa-clock text-sky-400"></i>
              <span className="font-medium">Same-day Service</span>
            </div>
            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
              <i className="fas fa-money-bill-wave text-green-400"></i>
              <span className="font-medium">Fair Pricing</span>
            </div>
          </div>
        </div>
        
        <div className="glass-card rounded-2xl p-8 max-w-4xl mx-auto slide-up">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            {/* Service Selection */}
            <div className="lg:col-span-4">
              <label className="block text-sm font-semibold text-text-primary mb-3">
                <i className="fas fa-wrench mr-2 text-primary"></i>
                What service do you need?
              </label>
              <Select value={selectedService} onValueChange={setSelectedService} disabled={servicesLoading}>
                <SelectTrigger className="w-full h-12 rounded-xl border-2 shadow-soft hover:shadow-medium transition-all duration-300">
                  <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select a service..."} />
                </SelectTrigger>
                <SelectContent className="rounded-xl shadow-xl border-0">
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id} className="rounded-lg">
                      <div className="flex items-center gap-3 py-1">
                        <span className="text-2xl">{service.displayName.split(' ')[0]}</span>
                        <span className="font-medium">{service.displayName.split(' ').slice(1).join(' ')}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Location Input */}
            <div className="lg:col-span-5">
              <label className="block text-sm font-semibold text-text-primary mb-3">
                <i className="fas fa-map-marker-alt mr-2 text-red-500"></i>
                Where do you need service?
              </label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your location or use GPS"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="h-12 pr-14 rounded-xl border-2 shadow-soft hover:shadow-medium transition-all duration-300 text-base text-slate-900 bg-white border-slate-300 focus:border-primary focus:ring-primary placeholder:text-slate-500"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 rounded-lg hover:bg-primary/10 transition-all duration-300"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : (
                    <MapPin className="h-5 w-5 text-primary" />
                  )}
                </Button>
              </div>
              {currentLocation && (
                <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                  <i className="fas fa-check-circle"></i>
                  Location detected successfully
                </p>
              )}
            </div>
            
            {/* Search Button */}
            <div className="lg:col-span-3">
              <Button
                onClick={handleSearch}
                disabled={isSearching || !selectedService || !currentLocation}
                className="w-full h-12 btn-gradient rounded-xl text-base font-semibold shadow-soft hover:shadow-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 mr-2" />
                    Find Providers
                  </>
                )}
              </Button>
            </div>
          </div>
          
          {/* Popular Services */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-text-secondary mb-3">Popular services:</p>
            <div className="flex flex-wrap gap-2">
              {services.slice(0, 4).map((service) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service.id)}
                  className="px-4 py-2 text-sm bg-white/50 hover:bg-white/80 rounded-full border border-gray-200 transition-all duration-300 hover:scale-105 font-medium"
                >
                  {service.displayName}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
