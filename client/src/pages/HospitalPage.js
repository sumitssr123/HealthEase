import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import API from "../api";
import { Row, Col, Card, Tag, Button, Modal, Form, Input, message, Spin, Empty } from "antd";
import { useAuth } from "../context/AuthContext";

const HospitalPage = () => {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMapHospital, setSelectedMapHospital] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const res = await API.get("/api/v1/hospitals");
      if (res.data && res.data.success) {
        setHospitals(res.data.data || []);
      }
    } catch (err) {
      console.error("Error fetching hospitals:", err);
      message.error("Failed to load hospital listings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHospitals();
  }, []);

  const handleAddHospital = async (values) => {
    try {
      setSubmitting(true);
      const payload = {
        name: values.name,
        address: values.address,
        description: values.description || "",
        services: values.services ? values.services.split(",").map((s) => s.trim()) : [],
        contact: values.contact || "",
        latitude: values.latitude ? parseFloat(values.latitude) : null,
        longitude: values.longitude ? parseFloat(values.longitude) : null,
      };

      const res = await API.post("/api/v1/hospitals", payload);
      if (res.data && res.data.success) {
        message.success("Hospital added successfully!");
        setIsAddModalOpen(false);
        form.resetFields();
        fetchHospitals();
      } else {
        message.error(res.data.message || "Failed to add hospital");
      }
    } catch (err) {
      console.error(err);
      message.error("Error creating hospital listing");
    } finally {
      setSubmitting(false);
    }
  };

  const isPrivileged = user?.isAdmin || user?.isDoctor;

  return (
    <Layout>
      <div className="p-4">
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap">
          <div>
            <h2 style={{ color: "#2c3e50", fontWeight: "bold" }}>
              <i className="fa-solid fa-hospital text-primary me-2"></i> Hospitals & Healthcare Centers
            </h2>
            <p className="text-muted">Find verified partner hospitals, emergency departments, and clinic locations.</p>
          </div>
          {isPrivileged && (
            <Button
              type="primary"
              size="large"
              className="mt-2"
              onClick={() => setIsAddModalOpen(true)}
              style={{ borderRadius: "8px" }}
            >
              <i className="fa-solid fa-plus me-2"></i> Add Hospital Listing
            </Button>
          )}
        </div>

        {loading ? (
          <div className="d-flex justify-content-center p-5">
            <Spin size="large" />
          </div>
        ) : hospitals.length === 0 ? (
          <Empty description="No hospitals registered in this area yet." />
        ) : (
          <Row gutter={[20, 20]}>
            {hospitals.map((hosp) => (
              <Col xs={24} md={12} lg={8} key={hosp._id || hosp.id}>
                <Card
                  className="shadow-sm border-0 h-100 d-flex flex-column"
                  style={{ borderRadius: "12px" }}
                  bodyStyle={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
                >
                  <div className="flex-grow-1">
                    <h4 className="text-dark fw-bold mb-2">{hosp.name}</h4>
                    <p className="text-muted mb-2">
                      <i className="fa-solid fa-location-dot text-danger me-2"></i>
                      {hosp.address}
                    </p>
                    {hosp.contact && (
                      <p className="text-secondary mb-2" style={{ fontSize: "14px" }}>
                        <i className="fa-solid fa-phone text-success me-2"></i>
                        {hosp.contact}
                      </p>
                    )}
                    <p className="text-secondary mt-2 mb-3" style={{ fontSize: "14px" }}>
                      {hosp.description}
                    </p>
                    <div className="mb-3">
                      <span className="text-muted d-block mb-1" style={{ fontSize: "12px" }}>Available Services:</span>
                      {hosp.services && hosp.services.map((svc, idx) => (
                        <Tag color="blue" key={idx} className="mb-1">{svc}</Tag>
                      ))}
                    </div>
                  </div>

                  <div className="mt-3">
                    <Button
                      type="primary"
                      ghost
                      className="w-100"
                      onClick={() => setSelectedMapHospital(hosp)}
                      style={{ borderRadius: "8px" }}
                    >
                      <i className="fa-solid fa-map-location-dot me-2"></i> View on Map
                    </Button>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        )}

        {/* Map Modal */}
        <Modal
          title={selectedMapHospital ? `Location: ${selectedMapHospital.name}` : "Hospital Map"}
          open={!!selectedMapHospital}
          onCancel={() => setSelectedMapHospital(null)}
          footer={null}
          width={800}
        >
          {selectedMapHospital && (
            <div>
              <p className="text-muted mb-3">
                <i className="fa-solid fa-location-dot text-danger me-2"></i> {selectedMapHospital.address}
              </p>
              <div style={{ height: "450px", borderRadius: "10px", overflow: "hidden" }}>
                <iframe
                  title="hospital-map"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    selectedMapHospital.latitude && selectedMapHospital.longitude
                      ? `${selectedMapHospital.latitude},${selectedMapHospital.longitude}`
                      : selectedMapHospital.address
                  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* Add Hospital Modal */}
        <Modal
          title="Register New Hospital"
          open={isAddModalOpen}
          onCancel={() => setIsAddModalOpen(false)}
          footer={null}
        >
          <Form form={form} layout="vertical" onFinish={handleAddHospital}>
            <Form.Item label="Hospital Name" name="name" rules={[{ required: true, message: "Please enter hospital name" }]}>
              <Input placeholder="e.g. City Care Multispeciality Hospital" />
            </Form.Item>
            <Form.Item label="Address" name="address" rules={[{ required: true, message: "Please enter address" }]}>
              <Input placeholder="Full physical street address and city" />
            </Form.Item>
            <Form.Item label="Contact Phone" name="contact">
              <Input placeholder="+91 9876543210" />
            </Form.Item>
            <Form.Item label="Description" name="description">
              <Input.TextArea rows={3} placeholder="Brief summary of hospital facilities and departments" />
            </Form.Item>
            <Form.Item label="Services (comma separated)" name="services">
              <Input placeholder="Emergency, Cardiology, Pediatrics, ICU" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Latitude (Optional)" name="latitude">
                  <Input placeholder="e.g. 25.4526" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Longitude (Optional)" name="longitude">
                  <Input placeholder="e.g. 81.8349" />
                </Form.Item>
              </Col>
            </Row>
            <div className="d-flex justify-content-end mt-3">
              <Button onClick={() => setIsAddModalOpen(false)} className="me-2">Cancel</Button>
              <Button type="primary" htmlType="submit" loading={submitting}>Submit Hospital</Button>
            </div>
          </Form>
        </Modal>
      </div>
    </Layout>
  );
};

export default HospitalPage;
