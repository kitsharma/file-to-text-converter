# tests/test_bls_integration.py
import pytest
from unittest.mock import Mock, patch
import json
from datetime import datetime

from src.integrations.bls_integration import (
    BLSIntegration, BLSDataPoint, BLSSeries, JobProjection
)


class TestBLSIntegration:
    """Test suite for BLS integration"""
    
    def setup_method(self):
        """Set up test fixtures"""
        self.bls = BLSIntegration()
        
        # Mock response data
        self.mock_bls_response = {
            "status": "REQUEST_SUCCEEDED",
            "responseTime": 123,
            "message": [],
            "Results": {
                "series": [
                    {
                        "seriesID": "LNS14000000",
                        "data": [
                            {
                                "year": "2024",
                                "period": "M01",
                                "periodName": "January",
                                "value": "3.9",
                                "footnotes": []
                            },
                            {
                                "year": "2023",
                                "period": "M12",
                                "periodName": "December",
                                "value": "3.7",
                                "footnotes": []
                            }
                        ]
                    }
                ]
            }
        }
    
    def test_initialization(self):
        """Test BLS integration initialization"""
        # Without API key
        bls = BLSIntegration()
        assert bls.api_key is None
        assert bls.base_url == "https://api.bls.gov/publicAPI/v2/timeseries/data/"
        
        # With API key
        bls_with_key = BLSIntegration(api_key="test_key")
        assert bls_with_key.api_key == "test_key"
    
    def test_rate_limiting(self):
        """Test rate limiting functionality"""
        import time
        
        start_time = time.time()
        self.bls._rate_limit()
        self.bls._rate_limit()
        end_time = time.time()
        
        # Should take at least 1 second due to rate limiting
        assert end_time - start_time >= 1.0
    
    def test_cache_operations(self):
        """Test cache functionality"""
        # Store data in cache
        test_data = {"test": "data"}
        self.bls._store_in_cache("test_key", test_data)
        
        # Retrieve from cache
        cached_data = self.bls._get_from_cache("test_key")
        assert cached_data == test_data
        
        # Non-existent key
        assert self.bls._get_from_cache("nonexistent") is None
    
    @patch('requests.Session.post')
    def test_get_time_series_data_success(self, mock_post):
        """Test successful time series data retrieval"""
        # Mock successful response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = self.mock_bls_response
        mock_post.return_value = mock_response
        
        series_data = self.bls.get_time_series_data(["LNS14000000"], 2023, 2024)
        
        assert len(series_data) == 1
        assert series_data[0].series_id == "LNS14000000"
        assert len(series_data[0].data) == 2
        assert series_data[0].data[0].value == "3.9"
        assert series_data[0].data[0].year == "2024"
    
    @patch('requests.Session.post')
    def test_get_time_series_data_api_error(self, mock_post):
        """Test API error handling"""
        # Mock error response
        mock_response = Mock()
        mock_response.raise_for_status.return_value = None
        mock_response.json.return_value = {
            "status": "REQUEST_NOT_PROCESSED",
            "message": ["Invalid series ID"],
            "Results": {}
        }
        mock_post.return_value = mock_response
        
        with pytest.raises(ValueError, match="BLS API error"):
            self.bls.get_time_series_data(["INVALID_ID"], 2023, 2024)
    
    @patch('requests.Session.post')
    def test_get_time_series_data_http_error(self, mock_post):
        """Test HTTP error handling"""
        # Mock HTTP error
        mock_response = Mock()
        mock_response.raise_for_status.side_effect = Exception("HTTP 500 Error")
        mock_post.return_value = mock_response
        
        with pytest.raises(Exception):
            self.bls.get_time_series_data(["LNS14000000"], 2023, 2024)
    
    @patch.object(BLSIntegration, 'get_time_series_data')
    def test_get_latest_unemployment_rate(self, mock_get_data):
        """Test getting latest unemployment rate"""
        # Mock time series data
        mock_series = BLSSeries(
            series_id="LNS14000000",
            data=[
                BLSDataPoint("LNS14000000", "2024", "M01", "January", "3.9", []),
                BLSDataPoint("LNS14000000", "2023", "M12", "December", "3.7", [])
            ]
        )
        mock_get_data.return_value = [mock_series]
        
        rate = self.bls.get_latest_unemployment_rate()
        assert rate == 3.9
    
    @patch.object(BLSIntegration, 'get_time_series_data')
    def test_get_latest_unemployment_rate_no_data(self, mock_get_data):
        """Test getting unemployment rate with no data"""
        mock_get_data.return_value = []
        
        rate = self.bls.get_latest_unemployment_rate()
        assert rate is None
    
    @patch.object(BLSIntegration, 'get_time_series_data')
    def test_get_employment_trends(self, mock_get_data):
        """Test getting employment trends"""
        # Mock multiple series
        mock_series_list = [
            BLSSeries("CES0000000001", [
                BLSDataPoint("CES0000000001", "2024", "M01", "January", "158000", [])
            ]),
            BLSSeries("LNS14000000", [
                BLSDataPoint("LNS14000000", "2024", "M01", "January", "3.9", [])
            ])
        ]
        mock_get_data.return_value = mock_series_list
        
        trends = self.bls.get_employment_trends()
        
        assert len(trends) == 2
        assert "CES0000000001" in trends
        assert "LNS14000000" in trends
    
    def test_get_occupation_projections(self):
        """Test getting occupation projections"""
        projections = self.bls.get_occupation_projections()
        
        assert len(projections) > 0
        assert all(isinstance(p, JobProjection) for p in projections)
        
        # Check for specific occupations
        data_scientist = next((p for p in projections if "Data Scientist" in p.occupation_title), None)
        assert data_scientist is not None
        assert data_scientist.change_percent > 0  # Should be growing
    
    def test_get_occupation_outlook(self):
        """Test getting outlook for specific occupation"""
        outlook = self.bls.get_occupation_outlook("15-2051")  # Data Scientists
        
        assert outlook is not None
        assert outlook.occupation_title == "Data Scientists"
        assert outlook.change_percent > 0
    
    def test_get_occupation_outlook_not_found(self):
        """Test getting outlook for non-existent occupation"""
        outlook = self.bls.get_occupation_outlook("99-9999")
        assert outlook is None
    
    def test_get_fastest_growing_occupations(self):
        """Test getting fastest growing occupations"""
        fastest_growing = self.bls.get_fastest_growing_occupations(limit=5)
        
        assert len(fastest_growing) <= 5
        assert all(p.change_percent > 0 for p in fastest_growing)
        
        # Should be sorted by growth rate
        for i in range(1, len(fastest_growing)):
            assert fastest_growing[i-1].change_percent >= fastest_growing[i].change_percent
    
    def test_get_highest_demand_occupations(self):
        """Test getting highest demand occupations"""
        highest_demand = self.bls.get_highest_demand_occupations(limit=5)
        
        assert len(highest_demand) <= 5
        assert all(p.change_numeric > 0 for p in highest_demand)
        
        # Should be sorted by absolute number of jobs
        for i in range(1, len(highest_demand)):
            assert highest_demand[i-1].change_numeric >= highest_demand[i].change_numeric
    
    def test_is_growing_field(self):
        """Test checking if occupation is in growing field"""
        # Test growing field
        is_growing, growth_rate = self.bls.is_growing_field("15-2051")  # Data Scientists
        assert is_growing is True
        assert growth_rate > 0
        
        # Test declining field
        is_growing, growth_rate = self.bls.is_growing_field("15-1251")  # Computer Programmers
        assert is_growing is False
        assert growth_rate < 0
        
        # Test non-existent field
        is_growing, growth_rate = self.bls.is_growing_field("99-9999")
        assert is_growing is False
        assert growth_rate is None
    
    @patch.object(BLSIntegration, 'get_time_series_data')
    def test_get_api_status_success(self, mock_get_data):
        """Test API status check - success"""
        mock_get_data.return_value = [BLSSeries("test", [])]
        
        status = self.bls.get_api_status()
        
        assert status['status'] == 'operational'
        assert status['test_successful'] is True
        assert status['has_api_key'] is False
    
    @patch.object(BLSIntegration, 'get_time_series_data')
    def test_get_api_status_error(self, mock_get_data):
        """Test API status check - error"""
        mock_get_data.side_effect = Exception("API Error")
        
        status = self.bls.get_api_status()
        
        assert status['status'] == 'error'
        assert status['test_successful'] is False
        assert 'error' in status


class TestBLSDataStructures:
    """Test BLS data structure classes"""
    
    def test_bls_data_point_creation(self):
        """Test BLSDataPoint creation"""
        data_point = BLSDataPoint(
            series_id="LNS14000000",
            year="2024",
            period="M01",
            period_name="January",
            value="3.9",
            footnotes=[]
        )
        
        assert data_point.series_id == "LNS14000000"
        assert data_point.year == "2024"
        assert data_point.value == "3.9"
    
    def test_bls_series_creation(self):
        """Test BLSSeries creation"""
        data_point = BLSDataPoint("test", "2024", "M01", "January", "3.9", [])
        series = BLSSeries(
            series_id="test_series",
            data=[data_point]
        )
        
        assert series.series_id == "test_series"
        assert len(series.data) == 1
        assert series.data[0].value == "3.9"
    
    def test_job_projection_creation(self):
        """Test JobProjection creation"""
        projection = JobProjection(
            occupation_code="15-2051",
            occupation_title="Data Scientists",
            employment_2022=192800,
            employment_2032=231900,
            change_numeric=39100,
            change_percent=20.3,
            median_annual_wage=131490,
            typical_education="Bachelor's degree",
            work_experience="None"
        )
        
        assert projection.occupation_code == "15-2051"
        assert projection.occupation_title == "Data Scientists"
        assert projection.change_percent == 20.3
        assert projection.median_annual_wage == 131490


if __name__ == "__main__":
    pytest.main([__file__])