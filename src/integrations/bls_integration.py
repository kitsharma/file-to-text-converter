# src/integrations/bls_integration.py
import requests
import json
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
import logging
import time

logger = logging.getLogger(__name__)


@dataclass
class BLSDataPoint:
    """Single BLS data point"""
    series_id: str
    year: str
    period: str
    period_name: str
    value: str
    footnotes: List[str]


@dataclass
class BLSSeries:
    """BLS time series data"""
    series_id: str
    data: List[BLSDataPoint]


@dataclass
class JobProjection:
    """Job growth projection data"""
    occupation_code: str
    occupation_title: str
    employment_2022: Optional[int]
    employment_2032: Optional[int]
    change_numeric: Optional[int]
    change_percent: Optional[float]
    median_annual_wage: Optional[int]
    typical_education: Optional[str]
    work_experience: Optional[str]


class BLSIntegration:
    """Integration with Bureau of Labor Statistics API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key
        self.base_url = "https://api.bls.gov/publicAPI/v2/timeseries/data/"
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'CareerAI-Platform/1.0'
        })
        
        # Rate limiting
        self.last_request_time = 0
        self.min_request_interval = 1.0  # 1 second between requests
        
        # Cache for frequently requested data
        self._cache: Dict[str, Tuple[datetime, any]] = {}
        self.cache_duration = timedelta(hours=24)  # Cache for 24 hours
        
        # Common series IDs for labor market data
        self.series_ids = {
            'total_employment': 'CES0000000001',  # Total nonfarm employment
            'unemployment_rate': 'LNS14000000',   # Unemployment rate
            'labor_force': 'LNS11000000',         # Civilian labor force
            'employment_pop_ratio': 'LNS12300000', # Employment-population ratio
            'avg_hourly_earnings': 'CES0500000003', # Average hourly earnings
            'job_openings': 'JTS000000000000000JOL', # Job openings
            'quits_rate': 'JTS000000000000000QUR',   # Quits rate
            'hires_rate': 'JTS000000000000000HIR'    # Hires rate
        }
    
    def _rate_limit(self):
        """Implement rate limiting"""
        current_time = time.time()
        time_since_last = current_time - self.last_request_time
        
        if time_since_last < self.min_request_interval:
            sleep_time = self.min_request_interval - time_since_last
            time.sleep(sleep_time)
        
        self.last_request_time = time.time()
    
    def _get_from_cache(self, cache_key: str) -> Optional[any]:
        """Get data from cache if still valid"""
        if cache_key in self._cache:
            timestamp, data = self._cache[cache_key]
            if datetime.now() - timestamp < self.cache_duration:
                return data
            else:
                del self._cache[cache_key]
        return None
    
    def _store_in_cache(self, cache_key: str, data: any):
        """Store data in cache"""
        self._cache[cache_key] = (datetime.now(), data)
    
    def get_time_series_data(self, series_ids: List[str], 
                           start_year: int, end_year: int) -> List[BLSSeries]:
        """Get time series data for specified series"""
        cache_key = f"timeseries_{'-'.join(series_ids)}_{start_year}_{end_year}"
        
        # Check cache first
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        self._rate_limit()
        
        # Prepare request payload
        payload = {
            'seriesid': series_ids,
            'startyear': str(start_year),
            'endyear': str(end_year)
        }
        
        if self.api_key:
            payload['registrationkey'] = self.api_key
        
        try:
            response = self.session.post(
                self.base_url,
                json=payload,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            
            if data.get('status') != 'REQUEST_SUCCEEDED':
                error_msg = ', '.join(data.get('message', ['Unknown error']))
                raise ValueError(f"BLS API error: {error_msg}")
            
            # Parse response into BLSSeries objects
            series_list = []
            for series_data in data.get('Results', {}).get('series', []):
                data_points = []
                for point in series_data.get('data', []):
                    data_points.append(BLSDataPoint(
                        series_id=series_data['seriesID'],
                        year=point['year'],
                        period=point['period'],
                        period_name=point['periodName'],
                        value=point['value'],
                        footnotes=point.get('footnotes', [])
                    ))
                
                series_list.append(BLSSeries(
                    series_id=series_data['seriesID'],
                    data=data_points
                ))
            
            # Cache the result
            self._store_in_cache(cache_key, series_list)
            
            return series_list
            
        except requests.RequestException as e:
            logger.error(f"Error fetching BLS data: {e}")
            raise
        except (KeyError, ValueError) as e:
            logger.error(f"Error parsing BLS response: {e}")
            raise
    
    def get_latest_unemployment_rate(self) -> Optional[float]:
        """Get the most recent unemployment rate"""
        try:
            series_data = self.get_time_series_data(
                [self.series_ids['unemployment_rate']], 
                datetime.now().year - 1, 
                datetime.now().year
            )
            
            if series_data and series_data[0].data:
                # Get the most recent data point
                latest_point = series_data[0].data[0]  # BLS returns most recent first
                return float(latest_point.value)
                
        except (ValueError, TypeError, IndexError) as e:
            logger.error(f"Error getting unemployment rate: {e}")
        
        return None
    
    def get_employment_trends(self, months: int = 12) -> Dict[str, List[BLSDataPoint]]:
        """Get employment trends for specified number of months"""
        current_year = datetime.now().year
        start_year = current_year - 2  # Get extra data to ensure we have enough
        
        key_series = [
            self.series_ids['total_employment'],
            self.series_ids['unemployment_rate'],
            self.series_ids['job_openings']
        ]
        
        try:
            series_data = self.get_time_series_data(key_series, start_year, current_year)
            
            trends = {}
            for series in series_data:
                # Filter to requested number of months
                recent_data = series.data[:months]
                trends[series.series_id] = recent_data
            
            return trends
            
        except Exception as e:
            logger.error(f"Error getting employment trends: {e}")
            return {}
    
    def get_occupation_projections(self) -> List[JobProjection]:
        """Get occupation employment projections (2022-2032)"""
        # Note: BLS doesn't provide projection data via the regular API
        # This would typically come from the Employment Projections program
        # For now, return static data based on published BLS reports
        
        cache_key = "occupation_projections_2022_2032"
        cached_data = self._get_from_cache(cache_key)
        if cached_data:
            return cached_data
        
        # Static data from BLS Employment Projections (2022-2032)
        # Source: https://www.bls.gov/emp/tables/fastest-growing-occupations.htm
        projections = [
            JobProjection(
                occupation_code="29-1141",
                occupation_title="Registered Nurses",
                employment_2022=3177700,
                employment_2032=3588700,
                change_numeric=410900,
                change_percent=12.9,
                median_annual_wage=81220,
                typical_education="Bachelor's degree",
                work_experience="None"
            ),
            JobProjection(
                occupation_code="15-1251",
                occupation_title="Computer Programmers",
                employment_2022=185700,
                employment_2032=174400,
                change_numeric=-11300,
                change_percent=-6.1,
                median_annual_wage=95640,
                typical_education="Bachelor's degree",
                work_experience="None"
            ),
            JobProjection(
                occupation_code="15-1211",
                occupation_title="Computer Systems Analysts",
                employment_2022=542000,
                employment_2032=592200,
                change_numeric=50200,
                change_percent=9.3,
                median_annual_wage=102240,
                typical_education="Bachelor's degree",
                work_experience="None"
            ),
            JobProjection(
                occupation_code="15-2051",
                occupation_title="Data Scientists",
                employment_2022=192800,
                employment_2032=231900,
                change_numeric=39100,
                change_percent=20.3,
                median_annual_wage=131490,
                typical_education="Bachelor's degree",
                work_experience="None"
            ),
            JobProjection(
                occupation_code="15-1212",
                occupation_title="Information Security Analysts",
                employment_2022=168900,
                employment_2032=200300,
                change_numeric=31400,
                change_percent=18.6,
                median_annual_wage=112000,
                typical_education="Bachelor's degree",
                work_experience="Less than 5 years"
            ),
            JobProjection(
                occupation_code="47-2111",
                occupation_title="Electricians",
                employment_2022=739200,
                employment_2032=812900,
                change_numeric=73700,
                change_percent=10.0,
                median_annual_wage=60040,
                typical_education="High school diploma",
                work_experience="None"
            ),
            JobProjection(
                occupation_code="31-9091",
                occupation_title="Dental Assistants",
                employment_2022=367500,
                employment_2032=399700,
                change_numeric=32200,
                change_percent=8.8,
                median_annual_wage=42530,
                typical_education="Postsecondary certificate",
                work_experience="None"
            )
        ]
        
        self._store_in_cache(cache_key, projections)
        return projections
    
    def get_occupation_outlook(self, occupation_code: str) -> Optional[JobProjection]:
        """Get employment outlook for specific occupation"""
        projections = self.get_occupation_projections()
        
        for projection in projections:
            if projection.occupation_code == occupation_code:
                return projection
        
        return None
    
    def get_fastest_growing_occupations(self, limit: int = 20) -> List[JobProjection]:
        """Get fastest growing occupations by percentage"""
        projections = self.get_occupation_projections()
        
        # Filter out occupations with negative growth and sort by growth rate
        growing_occupations = [p for p in projections if p.change_percent and p.change_percent > 0]
        growing_occupations.sort(key=lambda x: x.change_percent or 0, reverse=True)
        
        return growing_occupations[:limit]
    
    def get_highest_demand_occupations(self, limit: int = 20) -> List[JobProjection]:
        """Get occupations with highest absolute job growth"""
        projections = self.get_occupation_projections()
        
        # Filter and sort by absolute number of new jobs
        demand_occupations = [p for p in projections if p.change_numeric and p.change_numeric > 0]
        demand_occupations.sort(key=lambda x: x.change_numeric or 0, reverse=True)
        
        return demand_occupations[:limit]
    
    def is_growing_field(self, occupation_code: str) -> Tuple[bool, Optional[float]]:
        """Check if an occupation is in a growing field"""
        projection = self.get_occupation_outlook(occupation_code)
        
        if projection and projection.change_percent:
            return projection.change_percent > 0, projection.change_percent
        
        return False, None
    
    def get_api_status(self) -> Dict[str, any]:
        """Get API status and usage information"""
        try:
            # Test with a simple request
            test_series = self.get_time_series_data(
                [self.series_ids['unemployment_rate']], 
                datetime.now().year, 
                datetime.now().year
            )
            
            return {
                'status': 'operational',
                'has_api_key': bool(self.api_key),
                'cache_size': len(self._cache),
                'test_successful': len(test_series) > 0
            }
            
        except Exception as e:
            return {
                'status': 'error',
                'error': str(e),
                'has_api_key': bool(self.api_key),
                'cache_size': len(self._cache),
                'test_successful': False
            }