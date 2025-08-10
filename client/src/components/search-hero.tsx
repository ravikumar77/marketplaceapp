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
    <section className="bg-gradient-to-br from-primary to-blue-700 text-white py-16">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Find Trusted Local Service Providers
        </h1>
        <p className="text-xl mb-8 text-blue-100">
          Connect with verified professionals near you for home services, repairs, and more
        </p>
        
        <div className="bg-white rounded-xl shadow-material-3 p-6 text-left max-w-2xl mx-auto">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">Service Type</label>
              <Select value={selectedService} onValueChange={setSelectedService} disabled={servicesLoading}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={servicesLoading ? "Loading services..." : "Select a service..."} />
                </SelectTrigger>
                <SelectContent>
                  {services.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {service.displayName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <label className="block text-sm font-medium text-text-primary mb-2">Location</label>
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter your location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pr-12"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 text-primary hover:text-blue-700"
                  onClick={handleGetLocation}
                  disabled={gettingLocation}
                >
                  {gettingLocation ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <MapPin className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleSearch}
              disabled={isSearching || !selectedService || !currentLocation}
              className="bg-primary text-white hover:bg-blue-700 md:mt-7"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Search className="h-4 w-4 mr-2" />
              )}
              Search
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
