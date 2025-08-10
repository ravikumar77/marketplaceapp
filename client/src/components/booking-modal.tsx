import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface Service {
  id: string;
  displayName: string;
}

interface Provider {
  id: string;
  displayName: string;
  ratingAvg: number;
  reviewCount: number;
  distance: number;
  services: Array<{
    basePrice: string;
    priceUnit: string;
    service: Service;
  }>;
}

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  provider: Provider | null;
  service: Service | null;
  onSuccess: () => void;
}

export default function BookingModal({ isOpen, onClose, provider, service, onSuccess }: BookingModalProps) {
  const [formData, setFormData] = useState({
    date: "",
    time: "",
    address: "",
    requirements: "",
    contactNumber: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!provider || !service) return;

    setIsSubmitting(true);
    
    try {
      const scheduledStart = new Date(`${formData.date}T${formData.time}`);
      
      const bookingData = {
        clientId: "demo.client", // Using demo client username for now
        providerId: provider.id,
        serviceId: service.id,
        scheduledStart: scheduledStart.toISOString(),
        address: formData.address,
        requirements: formData.requirements,
        contactNumber: formData.contactNumber,
      };

      await apiRequest("POST", "/api/bookings", bookingData);
      
      toast({
        title: "Booking confirmed!",
        description: "Your booking request has been submitted. The provider will contact you shortly.",
      });
      
      onSuccess();
    } catch (error) {
      toast({
        title: "Booking failed",
        description: "There was an error submitting your booking. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(<Star key={i} className="w-3 h-3 fill-accent text-accent" />);
    }
    
    const emptyStars = 5 - fullStars;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Star key={`empty-${i}`} className="w-3 h-3 text-accent" />);
    }
    
    return stars;
  };

  const getEstimatedPrice = () => {
    if (!provider?.services[0]) return "₹300 - ₹500";
    const basePrice = provider.services[0].basePrice;
    const unit = provider.services[0].priceUnit;
    return `₹${basePrice}/${unit.replace('per_', '')}`;
  };

  const getAvatarUrl = () => {
    return "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&w=150&h=150&fit=crop&crop=face";
  };

  if (!provider || !service) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Service</DialogTitle>
        </DialogHeader>

        {/* Provider Summary */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <img 
              src={getAvatarUrl()}
              alt={provider.displayName}
              className="w-12 h-12 rounded-full object-cover"
            />
            <div>
              <h4 className="font-medium text-text-primary">{provider.displayName}</h4>
              <p className="text-sm text-text-secondary">{service.displayName}</p>
              <div className="flex items-center space-x-1 mt-1">
                <div className="flex">
                  {renderStars(provider.ratingAvg)}
                </div>
                <span className="text-xs text-text-secondary">
                  {provider.ratingAvg.toFixed(1)} • {provider.distance.toFixed(1)} km away
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Booking Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label htmlFor="date">Service Date</Label>
            <Input
              id="date"
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <Label htmlFor="time">Preferred Time</Label>
            <Select value={formData.time} onValueChange={(value) => setFormData({ ...formData, time: value })}>
              <SelectTrigger>
                <SelectValue placeholder="Select time slot" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="09:00">9:00 AM - 10:00 AM</SelectItem>
                <SelectItem value="10:00">10:00 AM - 11:00 AM</SelectItem>
                <SelectItem value="11:00">11:00 AM - 12:00 PM</SelectItem>
                <SelectItem value="14:00">2:00 PM - 3:00 PM</SelectItem>
                <SelectItem value="15:00">3:00 PM - 4:00 PM</SelectItem>
                <SelectItem value="16:00">4:00 PM - 5:00 PM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Service Address</Label>
            <Textarea
              id="address"
              placeholder="Enter your complete address..."
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="h-20"
            />
          </div>

          <div>
            <Label htmlFor="requirements">Additional Requirements</Label>
            <Textarea
              id="requirements"
              placeholder="Any specific requirements or instructions..."
              value={formData.requirements}
              onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
              className="h-20"
            />
          </div>

          <div>
            <Label htmlFor="contact">Contact Number</Label>
            <Input
              id="contact"
              type="tel"
              placeholder="+91 XXXXX XXXXX"
              required
              value={formData.contactNumber}
              onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
            />
          </div>

          {/* Price Estimate */}
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-text-secondary">Estimated Cost</span>
              <span className="text-lg font-semibold text-primary">{getEstimatedPrice()}</span>
            </div>
            <p className="text-xs text-text-secondary mt-1">Final price will be confirmed by the provider</p>
          </div>

          <div className="flex space-x-3">
            <Button 
              type="button" 
              variant="outline"
              className="flex-1"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              className="flex-1 bg-primary hover:bg-blue-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Booking...
                </>
              ) : (
                "Confirm Booking"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
