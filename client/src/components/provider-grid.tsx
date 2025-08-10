import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, Eye } from "lucide-react";

interface Service {
  id: string;
  displayName: string;
}

interface Provider {
  id: string;
  displayName: string;
  ratingAvg: number;
  reviewCount: number;
  verified: boolean;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    service: Service;
  }>;
  distance: number;
}

interface ProviderGridProps {
  providers: Provider[];
  onBookService: (provider: Provider, service: Service) => void;
  onViewProfile: (provider: Provider) => void;
}

export default function ProviderGrid({ providers, onBookService, onViewProfile }: ProviderGridProps) {
  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-4 h-4 fill-accent text-accent" />);
    }

    if (hasHalfStar) {
      stars.push(<Star key="half" className="w-4 h-4 fill-accent/50 text-accent" />);
    }

    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-4 h-4 text-accent" />);
    }

    return stars;
  };

  const getAvatarUrl = (name: string, index: number) => {
    const avatars = [
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face",
    ];
    return avatars[index % avatars.length];
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {providers.map((provider, index) => {
        const primaryService = provider.services[0];
        
        return (
          <div key={provider.id} className="bg-white rounded-xl shadow-material-1 hover:shadow-material-2 transition-shadow cursor-pointer">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <img 
                    src={getAvatarUrl(provider.displayName, index)}
                    alt={`${provider.displayName} profile`}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-text-primary">{provider.displayName}</h3>
                    <p className="text-sm text-text-secondary">
                      {primaryService?.service.displayName || "Service Provider"}
                    </p>
                  </div>
                </div>
                {provider.verified && (
                  <Badge className="bg-success/10 text-success hover:bg-success/20">
                    Verified
                  </Badge>
                )}
              </div>

              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-1">
                  <div className="flex">
                    {renderStars(provider.ratingAvg)}
                  </div>
                  <span className="text-sm font-medium text-text-primary">
                    {provider.ratingAvg.toFixed(1)}
                  </span>
                  <span className="text-sm text-text-secondary">
                    ({provider.reviewCount})
                  </span>
                </div>
                
                <div className="flex items-center text-text-secondary text-sm">
                  <MapPin className="w-4 h-4 mr-1" />
                  <span>{provider.distance.toFixed(1)} km away</span>
                </div>
              </div>

              {primaryService && (
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-text-secondary">Starting from</span>
                    <span className="text-lg font-semibold text-text-primary">
                      ₹{primaryService.basePrice}/{primaryService.priceUnit.replace('per_', '')}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex space-x-2">
                <Button 
                  className="flex-1 bg-primary text-white hover:bg-blue-700"
                  onClick={() => primaryService && onBookService(provider, primaryService.service)}
                >
                  Book Service
                </Button>
                <Button 
                  variant="outline"
                  size="icon"
                  onClick={() => onViewProfile(provider)}
                  className="hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 text-text-secondary" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
