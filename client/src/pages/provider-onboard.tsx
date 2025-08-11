import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function ProviderOnboard() {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    displayName: "",
    lat: "",
    lon: "",
    email: "",
    businessType: ""
  });
  const [documents, setDocuments] = useState<FileList | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      if (documents) {
        Array.from(documents).forEach(file => {
          formDataToSend.append('documents', file);
        });
      }

      const response = await fetch('/api/providers/onboard', {
        method: 'POST',
        body: formDataToSend
      });

      if (response.ok) {
        const result = await response.json();
        toast({
          title: "Application Submitted",
          description: "Your provider application has been submitted for verification."
        });
        // Reset form
        setFormData({
          name: "",
          phone: "",
          displayName: "",
          lat: "",
          lon: "",
          email: "",
          businessType: ""
        });
        setDocuments(null);
      } else {
        throw new Error('Failed to submit application');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <Card className="max-w-2xl mx-auto shadow-xl border-0">
        <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
          <CardTitle className="text-center text-2xl font-bold">
            Provider Registration
          </CardTitle>
          <CardDescription className="text-center text-blue-100">
            Join our platform and start offering your services
          </CardDescription>
        </CardHeader>
        <CardContent className="p-8 bg-white">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-gray-700 font-medium">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Your full name"
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-gray-700 font-medium">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="your@email.com"
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-gray-700 font-medium">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="+1 (555) 000-0000"
                required
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessType" className="text-gray-700 font-medium">Business Type *</Label>
              <select
                id="businessType"
                value={formData.businessType}
                onChange={(e) => setFormData({...formData, businessType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-700"
                required
              >
                <option value="">Select business type</option>
                <option value="home-services">Home Services</option>
                <option value="health-wellness">Health & Wellness</option>
                <option value="beauty-personal-care">Beauty & Personal Care</option>
                <option value="automotive">Automotive</option>
                <option value="education-tutoring">Education & Tutoring</option>
                <option value="consulting">Consulting</option>
                <option value="technology">Technology</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="lat" className="text-gray-700 font-medium">Latitude</Label>
                <Input
                  id="lat"
                  type="number"
                  step="any"
                  value={formData.lat}
                  onChange={(e) => setFormData({...formData, lat: e.target.value})}
                  placeholder="e.g., 28.6139"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lon" className="text-gray-700 font-medium">Longitude</Label>
                <Input
                  id="lon"
                  type="number"
                  step="any"
                  value={formData.lon}
                  onChange={(e) => setFormData({...formData, lon: e.target.value})}
                  placeholder="e.g., 77.2090"
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="documents" className="text-gray-700 font-medium">Documents (ID, Business License, etc.)</Label>
              <Input
                id="documents"
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setDocuments(e.target.files)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-500 mt-1">
                Upload up to 5 files (PDF, JPG, PNG)
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full py-3 font-semibold text-lg rounded-md transition duration-300 ease-in-out hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
              {isSubmitting ? "Submitting..." : "Submit Application"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}