#!/usr/bin/env python3
"""
Advanced Basketball-Biotech Integration Module

This module provides sophisticated integration between basketball analytics
and biotech data for performance optimization, injury prevention, and
personalized training recommendations.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import statistics
import numpy as np
from scipy import stats
import pandas as pd


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


class FatigueLevel(Enum):
    """Fatigue level classification."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"


class InjuryRisk(Enum):
    """Injury risk classification."""
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    VERY_HIGH = "very_high"


class RecoveryPriority(Enum):
    """Recovery priority classification."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class BiometricData:
    """Biometric data for an athlete."""
    player_id: str
    timestamp: datetime
    heart_rate: Optional[float] = None
    heart_rate_variability: Optional[float] = None
    sleep_duration_hours: Optional[float] = None
    sleep_quality: Optional[float] = None
    hydration_level: Optional[float] = None
    body_temperature: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    cortisol_level: Optional[float] = None
    inflammation_markers: Optional[float] = None
    lactate_level: Optional[float] = None
    muscle_soreness: Optional[float] = None
    stress_level: Optional[float] = None


@dataclass
class PerformanceMetrics:
    """Basketball performance metrics."""
    player_id: str
    timestamp: datetime
    points: Optional[float] = None
    assists: Optional[float] = None
    rebounds: Optional[float] = None
    steals: Optional[float] = None
    blocks: Optional[float] = None
    turnovers: Optional[float] = None
    field_goal_percentage: Optional[float] = None
    three_point_percentage: Optional[float] = None
    free_throw_percentage: Optional[float] = None
    minutes_played: Optional[float] = None
    plus_minus: Optional[float] = None
    player_efficiency_rating: Optional[float] = None
    usage_rate: Optional[float] = None


@dataclass
class IntegrationResult:
    """Result of basketball-biotech integration analysis."""
    player_id: str
    analysis_timestamp: datetime
    performance_score: float
    health_score: float
    fatigue_level: FatigueLevel
    injury_risk: InjuryRisk
    recovery_priority: RecoveryPriority
    readiness_to_play: float
    optimization_opportunities: List[str]
    personalized_recommendations: List[str]
    predicted_performance: Dict[str, float]
    confidence_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)


class BasketballBiotechIntegrator:
    """Main integration class for basketball and biotech data."""
    
    def __init__(self):
        self.player_history: Dict[str, List[Tuple[datetime, Any]]] = {}
        self.model_weights = self._initialize_model_weights()
        
    def _initialize_model_weights(self) -> Dict[str, float]:
        """Initialize weights for different factors in the model."""
        return {
            # Performance factors
            'scoring_efficiency': 0.25,
            'playmaking': 0.15,
            'defensive_impact': 0.20,
            'consistency': 0.10,
            
            # Health factors
            'cardiovascular_health': 0.15,
            'recovery_status': 0.20,
            'stress_level': 0.10,
            'inflammation': 0.10,
            
            # Fatigue factors
            'sleep_quality': 0.25,
            'training_load': 0.30,
            'muscle_soreness': 0.20,
            'hydration': 0.15,
            'stress_accumulation': 0.10,
        }
    
    def integrate_data(self, biometric: BiometricData, performance: PerformanceMetrics) -> IntegrationResult:
        """Integrate biometric and performance data for comprehensive analysis."""
        
        # Calculate individual scores
        performance_score = self._calculate_performance_score(performance)
        health_score = self._calculate_health_score(biometric)
        fatigue_level = self._assess_fatigue_level(biometric, performance)
        injury_risk = self._assess_injury_risk(biometric, performance)
        recovery_priority = self._determine_recovery_priority(fatigue_level, injury_risk, health_score)
        readiness_to_play = self._calculate_readiness_to_play(performance_score, health_score, fatigue_level)
        
        # Generate insights
        optimization_opportunities = self._identify_optimization_opportunities(biometric, performance)
        personalized_recommendations = self._generate_recommendations(
            biometric, performance, fatigue_level, injury_risk, recovery_priority
        )
        
        # Predict future performance
        predicted_performance = self._predict_performance(biometric, performance, readiness_to_play)
        
        # Calculate confidence
        confidence_score = self._calculate_confidence_score(biometric, performance)
        
        # Store in history
        self._store_player_data(biometric.player_id, biometric.timestamp, {
            'biometric': biometric,
            'performance': performance,
            'analysis': {
                'performance_score': performance_score,
                'health_score': health_score,
                'fatigue_level': fatigue_level.value,
                'readiness_to_play': readiness_to_play
            }
        })
        
        return IntegrationResult(
            player_id=biometric.player_id,
            analysis_timestamp=datetime.now(),
            performance_score=performance_score,
            health_score=health_score,
            fatigue_level=fatigue_level,
            injury_risk=injury_risk,
            recovery_priority=recovery_priority,
            readiness_to_play=readiness_to_play,
            optimization_opportunities=optimization_opportunities,
            personalized_recommendations=personalized_recommendations,
            predicted_performance=predicted_performance,
            confidence_score=confidence_score,
            metadata={
                'data_completeness': self._calculate_data_completeness(biometric, performance),
                'trend_analysis': self._analyze_trends(biometric.player_id),
                'anomalies_detected': self._detect_anomalies(biometric, performance)
            }
        )
    
    def _calculate_performance_score(self, performance: PerformanceMetrics) -> float:
        """Calculate comprehensive performance score."""
        scores = []
        weights = []
        
        # Scoring efficiency
        if performance.field_goal_percentage is not None:
            fg_score = min(performance.field_goal_percentage / 60, 1.0)  # Normalize to 60% as perfect
            scores.append(fg_score)
            weights.append(self.model_weights['scoring_efficiency'])
        
        # Playmaking
        if performance.assists is not None and performance.turnovers is not None:
            if performance.turnovers > 0:
                ast_to_ratio = performance.assists / performance.turnovers
                playmaking_score = min(ast_to_ratio / 3, 1.0)  # Normalize to 3:1 as perfect
            else:
                playmaking_score = 1.0
            scores.append(playmaking_score)
            weights.append(self.model_weights['playmaking'])
        
        # Defensive impact
        if performance.steals is not None and performance.blocks is not None:
            defensive_score = min((performance.steals + performance.blocks) / 5, 1.0)
            scores.append(defensive_score)
            weights.append(self.model_weights['defensive_impact'])
        
        # Consistency (using player efficiency rating if available)
        if performance.player_efficiency_rating is not None:
            consistency_score = min(performance.player_efficiency_rating / 30, 1.0)
            scores.append(consistency_score)
            weights.append(self.model_weights['consistency'])
        
        # Calculate weighted average
        if scores and weights:
            total_weight = sum(weights)
            weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
            return round(weighted_score, 3)
        
        return 0.5  # Default score if insufficient data
    
    def _calculate_health_score(self, biometric: BiometricData) -> float:
        """Calculate comprehensive health score."""
        scores = []
        weights = []
        
        # Cardiovascular health
        if biometric.heart_rate_variability is not None:
            # HRV: higher is better, typical range 20-200 ms
            hrv_score = min(max((biometric.heart_rate_variability - 20) / 180, 0), 1)
            scores.append(hrv_score)
            weights.append(self.model_weights['cardiovascular_health'])
        
        # Recovery status (combination of sleep and muscle soreness)
        recovery_factors = []
        if biometric.sleep_quality is not None:
            recovery_factors.append(biometric.sleep_quality)
        if biometric.muscle_soreness is not None:
            # Invert soreness (lower is better)
            soreness_score = 1 - min(biometric.muscle_soreness, 1.0)
            recovery_factors.append(soreness_score)
        
        if recovery_factors:
            recovery_score = statistics.mean(recovery_factors)
            scores.append(recovery_score)
            weights.append(self.model_weights['recovery_status'])
        
        # Stress level
        if biometric.cortisol_level is not None:
            # Cortisol: lower is better, typical range 5-25 mcg/dL
            cortisol_score = 1 - min(max((biometric.cortisol_level - 5) / 20, 0), 1)
            scores.append(cortisol_score)
            weights.append(self.model_weights['stress_level'])
        
        # Inflammation
        if biometric.inflammation_markers is not None:
            # CRP: lower is better, <1.0 mg/L is optimal
            inflammation_score = 1 - min(biometric.inflammation_markers, 1.0)
            scores.append(inflammation_score)
            weights.append(self.model_weights['inflammation'])
        
        # Calculate weighted average
        if scores and weights:
            total_weight = sum(weights)
            weighted_score = sum(s * w for s, w in zip(scores, weights)) / total_weight
            return round(weighted_score, 3)
        
        return 0.7  # Default health score
    
    def _assess_fatigue_level(self, biometric: BiometricData, performance: PerformanceMetrics) -> FatigueLevel:
        """Assess fatigue level based on multiple factors."""
        fatigue_score = 0
        
        # Sleep quality
        if biometric.sleep_quality is not None:
            if biometric.sleep_quality < 0.3:
                fatigue_score += 3
            elif biometric.sleep_quality < 0.6:
                fatigue_score += 2
            elif biometric.sleep_quality < 0.8:
                fatigue_score += 1
        
        # Training load (estimated from minutes played)
        if performance.minutes_played is not None:
            if performance.minutes_played > 40:
                fatigue_score += 3
            elif performance.minutes_played > 35:
                fatigue_score += 2
            elif performance.minutes_played > 30:
                fatigue_score += 1
        
        # Muscle soreness
        if biometric.muscle_soreness is not None:
            if biometric.muscle_soreness > 0.8:
                fatigue_score += 3
            elif biometric.muscle_soreness > 0.5:
                fatigue_score += 2
            elif biometric.muscle_soreness > 0.3:
                fatigue_score += 1
        
        # Hydration
        if biometric.hydration_level is not None:
            if biometric.hydration_level < 0.7:
                fatigue_score += 2
            elif biometric.hydration_level < 0.85:
                fatigue_score += 1
        
        # Stress accumulation
        if biometric.stress_level is not None:
            if biometric.stress_level > 0.8:
                fatigue_score += 2
            elif biometric.stress_level > 0.6:
                fatigue_score += 1
        
        # Determine fatigue level
        if fatigue_score >= 8:
            return FatigueLevel.CRITICAL
        elif fatigue_score >= 5:
            return FatigueLevel.HIGH
        elif fatigue_score >= 3:
            return FatigueLevel.MODERATE
        else:
            return FatigueLevel.LOW
    
    def _assess_injury_risk(self, biometric: BiometricData, performance: PerformanceMetrics) -> InjuryRisk:
        """Assess injury risk based on biometric and performance data."""
        risk_score = 0
        
        # High fatigue increases injury risk
        fatigue_level = self._assess_fatigue_level(biometric, performance)
        if fatigue_level == FatigueLevel.CRITICAL:
            risk_score += 3
        elif fatigue_level == FatigueLevel.HIGH:
            risk_score += 2
        elif fatigue_level == FatigueLevel.MODERATE:
            risk_score += 1
        
        # High inflammation increases injury risk
        if biometric.inflammation_markers is not None:
            if biometric.inflammation_markers > 0.8:
                risk_score += 3
            elif biometric.inflammation_markers > 0.5:
                risk_score += 2
            elif biometric.inflammation_markers > 0.3:
                risk_score += 1
        
        # High muscle soreness increases injury risk
        if biometric.muscle_soreness is not None:
            if biometric.muscle_soreness > 0.8:
                risk_score += 2
            elif biometric.muscle_soreness > 0.5:
                risk_score += 1
        
        # High lactate levels (indicator of intense exercise)
        if biometric.lactate_level is not None:
            if biometric.lactate_level > 8:  # mmol/L
                risk_score += 2
            elif biometric.lactate_level > 4:
                risk_score += 1
        
        # Determine injury risk
        if risk_score >= 6:
            return InjuryRisk.VERY_HIGH
        elif risk_score >= 4:
            return InjuryRisk.HIGH
        elif risk_score >= 2:
            return InjuryRisk.MODERATE
        else:
            return InjuryRisk.LOW
    
    def _determine_recovery_priority(self, fatigue: FatigueLevel, injury_risk: InjuryRisk, 
                                    health_score: float) -> RecoveryPriority:
        """Determine recovery priority based on multiple factors."""
        priority_score = 0
        
        # Fatigue contribution
        if fatigue == FatigueLevel.CRITICAL:
            priority_score += 3
        elif fatigue == FatigueLevel.HIGH:
            priority_score += 2
        elif fatigue == FatigueLevel.MODERATE:
            priority_score += 1
        
        # Injury risk contribution
        if injury_risk == InjuryRisk.VERY_HIGH:
            priority_score += 3
        elif injury_risk == InjuryRisk.HIGH:
            priority_score += 2
        elif injury_risk == InjuryRisk.MODERATE:
            priority_score += 1
        
        # Health score contribution (lower health = higher priority)
        if health_score < 0.4:
            priority_score += 3
        elif health_score < 0.6:
            priority_score += 2
        elif health_score < 0.8:
            priority_score += 1
        
        # Determine recovery priority
        if priority_score >= 7:
            return RecoveryPriority.CRITICAL
        elif priority_score >= 5:
            return RecoveryPriority.HIGH
        elif priority_score >= 3:
            return RecoveryPriority.MEDIUM
        else:
            return RecoveryPriority.LOW
    
    def _calculate_readiness_to_play(self, performance_score: float, health_score: float, 
                                    fatigue: FatigueLevel) -> float:
        """Calculate readiness to play score (0-1)."""
        # Base readiness from performance and health
        base_readiness = (performance_score * 0.6 + health_score * 0.4)
        
        # Adjust for fatigue
        fatigue_adjustment = {
            FatigueLevel.LOW: 1.0,
            FatigueLevel.MODERATE: 0.8,
            FatigueLevel.HIGH: 0.6,
            FatigueLevel.CRITICAL: 0.4
        }
        
        adjusted_readiness = base_readiness * fatigue_adjustment[fatigue]
        return round(adjusted_readiness, 3)
    
    def _identify_optimization_opportunities(self, biometric: BiometricData, 
                                           performance: PerformanceMetrics) -> List[str]:
        """Identify optimization opportunities."""
        opportunities = []
        
        # Performance optimization
        if performance.field_goal_percentage is not None and performance.field_goal_percentage < 0.45:
            opportunities.append("shooting_efficiency_training")
        
        if performance.turnovers is not None and performance.turnovers > 3:
            opportunities.append("ball_handling_improvement")
        
        if performance.three_point_percentage is not None and performance.three_point_percentage < 0.35:
            opportunities.append("three_point_shooting_training")
        
        # Health and recovery optimization
        if biometric.sleep_quality is not None and biometric.sleep_quality < 0.7:
            opportunities.append("sleep_optimization_program")
        
        if biometric.hydration_level is not None and biometric.hydration_level < 0.85:
            opportunities.append("hydration_management")
        
        if biometric.cortisol_level is not None and biometric.cortisol_level > 15:
            opportunities.append("stress_management_training")
        
        if biometric.inflammation_markers is not None and biometric.inflammation_markers > 0.5:
            opportunities.append("anti_inflammatory_nutrition")
        
        # Fatigue management
        fatigue_level = self._assess_fatigue_level(biometric, performance)
        if fatigue_level in [FatigueLevel.HIGH, FatigueLevel.CRITICAL]:
            opportunities.append("fatigue_management_program")
        
        return opportunities[:10]  # Return top 10 opportunities
    
    def _generate_recommendations(self, biometric: BiometricData, performance: PerformanceMetrics,
                                 fatigue: FatigueLevel, injury_risk: InjuryRisk,
                                 recovery_priority: RecoveryPriority) -> List[str]:
        """Generate personalized recommendations."""
        recommendations = []
        
        # Performance recommendations
        if performance.field_goal_percentage is not None and performance.field_goal_percentage < 0.45:
            recommendations.append("Focus on form shooting drills and game-situation shooting practice")
        
        if performance.turnovers is not None and performance.turnovers > 3:
            recommendations.append("Incorporate ball-handling drills with defensive pressure simulation")
        
        # Recovery recommendations based on priority
        if recovery_priority in [RecoveryPriority.HIGH, RecoveryPriority.CRITICAL]:
            recommendations.append("Implement active recovery protocol: swimming, yoga, light cycling")
            recommendations.append("Increase sleep duration to 9+ hours with consistent sleep schedule")
        
        if fatigue in [FatigueLevel.HIGH, FatigueLevel.CRITICAL]:
            recommendations.append("Reduce training intensity by 30-40% for next 48 hours")
            recommendations.append("Incorporate contrast water therapy (hot/cold immersion)")
        
        # Injury prevention
        if injury_risk in [InjuryRisk.HIGH, InjuryRisk.VERY_HIGH]:
            recommendations.append("Consult with sports medicine specialist for injury risk assessment")
            recommendations.append("Implement prehabilitation exercises targeting common injury sites")
        
        # Nutritional recommendations
        if biometric.inflammation_markers is not None and biometric.inflammation_markers > 0.5:
            recommendations.append("Increase anti-inflammatory foods: turmeric, ginger, fatty fish, berries")
        
        if biometric.hydration_level is not None and biometric.hydration_level < 0.85:
            recommendations.append("Increase fluid intake to 3-4 liters daily, monitor urine color")
        
        # Sleep optimization
        if biometric.sleep_quality is not None and biometric.sleep_quality < 0.7:
            recommendations.append("Establish consistent sleep-wake schedule (±30 minutes)")
            recommendations.append("Create optimal sleep environment: dark, cool (65-68°F), quiet")
        
        return recommendations[:8]  # Return top 8 recommendations
    
    def _predict_performance(self, biometric: BiometricData, performance: PerformanceMetrics,
                            readiness: float) -> Dict[str, float]:
        """Predict future performance metrics."""
        predictions = {}
        
        # Base predictions on current performance adjusted by readiness
        if performance.points is not None:
            predictions['predicted_points'] = round(performance.points * readiness, 1)
        
        if performance.assists is not None:
            predictions['predicted_assists'] = round(performance.assists * readiness, 1)
        
        if performance.rebounds is not None:
            predictions['predicted_rebounds'] = round(performance.rebounds * readiness, 1)
        
        if performance.field_goal_percentage is not None:
            # Shooting percentage less affected by readiness
            fg_impact = 0.3 + (readiness * 0.7)  # 30% baseline + 70% readiness
            predictions['predicted_fg_percentage'] = round(performance.field_goal_percentage * fg_impact, 1)
        
        # Add confidence intervals
        for key in list(predictions.keys()):
            base_value = predictions[key]
            predictions[f'{key}_low'] = round(base_value * 0.8, 1)
            predictions[f'{key}_high'] = round(base_value * 1.2, 1)
        
        return predictions
    
    def _calculate_confidence_score(self, biometric: BiometricData, 
                                   performance: PerformanceMetrics) -> float:
        """Calculate confidence score for the analysis."""
        completeness_score = self._calculate_data_completeness(biometric, performance)
        
        # Adjust based on data quality indicators
        confidence = 0.6  # Base confidence
        
        # Increase confidence with more complete data
        confidence += completeness_score * 0.3
        
        # Increase confidence if we have historical data for trend analysis
        if biometric.player_id in self.player_history:
            history_count = len(self.player_history[biometric.player_id])
            if history_count >= 5:
                confidence += 0.1
            elif history_count >= 2:
                confidence += 0.05
        
        return round(min(confidence, 1.0), 3)
    
    def _calculate_data_completeness(self, biometric: BiometricData, 
                                    performance: PerformanceMetrics) -> float:
        """Calculate how complete the input data is."""
        biometric_fields = [f for f in dir(biometric) if not f.startswith('_') and f != 'player_id' and f != 'timestamp']
        performance_fields = [f for f in dir(performance) if not f.startswith('_') and f != 'player_id' and f != 'timestamp']
        
        biometric_complete = sum(1 for f in biometric_fields if getattr(biometric, f) is not None)
        performance_complete = sum(1 for f in performance_fields if getattr(performance, f) is not None)
        
        total_fields = len(biometric_fields) + len(performance_fields)
        complete_fields = biometric_complete + performance_complete
        
        return complete_fields / total_fields if total_fields > 0 else 0
    
    def _store_player_data(self, player_id: str, timestamp: datetime, data: Any):
        """Store player data for trend analysis."""
        if player_id not in self.player_history:
            self.player_history[player_id] = []
        
        self.player_history[player_id].append((timestamp, data))
        
        # Keep only last 30 days of data
        cutoff = datetime.now() - timedelta(days=30)
        self.player_history[player_id] = [
            (ts, d) for ts, d in self.player_history[player_id] if ts > cutoff
        ]
    
    def _analyze_trends(self, player_id: str) -> Dict[str, Any]:
        """Analyze trends for a player based on historical data."""
        if player_id not in self.player_history or len(self.player_history[player_id]) < 3:
            return {"has_sufficient_data": False}
        
        # Get historical data sorted by timestamp
        history = sorted(self.player_history[player_id], key=lambda x: x[0])
        
        trends = {
            "has_sufficient_data": True,
            "data_points": len(history),
            "time_span_days": (history[-1][0] - history[0][0]).days,
            "performance_trend": "stable",
            "health_trend": "stable",
            "fatigue_trend": "stable"
        }
        
        # Extract performance and health scores
        performance_scores = [d[1]['analysis']['performance_score'] for d in history]
        health_scores = [d[1]['analysis']['health_score'] for d in history]
        
        # Calculate trends using linear regression
        if len(performance_scores) >= 3:
            x = list(range(len(performance_scores)))
            slope, _, _, _, _ = stats.linregress(x, performance_scores)
            trends['performance_trend_slope'] = round(slope, 4)
            trends['performance_trend'] = "improving" if slope > 0.01 else "declining" if slope < -0.01 else "stable"
        
        if len(health_scores) >= 3:
            x = list(range(len(health_scores)))
            slope, _, _, _, _ = stats.linregress(x, health_scores)
            trends['health_trend_slope'] = round(slope, 4)
            trends['health_trend'] = "improving" if slope > 0.01 else "declining" if slope < -0.01 else "stable"
        
        return trends
    
    def _detect_anomalies(self, biometric: BiometricData, performance: PerformanceMetrics) -> List[Dict[str, Any]]:
        """Detect anomalies in the current data."""
        anomalies = []
        
        # Heart rate anomalies
        if biometric.heart_rate is not None:
            if biometric.heart_rate > 100:  # Resting heart rate too high
                anomalies.append({
                    "type": "elevated_heart_rate",
                    "metric": "heart_rate",
                    "value": biometric.heart_rate,
                    "threshold": 100,
                    "severity": "moderate"
                })
        
        # Sleep duration anomalies
        if biometric.sleep_duration_hours is not None:
            if biometric.sleep_duration_hours < 6:
                anomalies.append({
                    "type": "insufficient_sleep",
                    "metric": "sleep_duration_hours",
                    "value": biometric.sleep_duration_hours,
                    "threshold": 6,
                    "severity": "high"
                })
        
        # Performance anomalies (sudden drop)
        if performance.field_goal_percentage is not None:
            if performance.field_goal_percentage < 0.35:  # Very low shooting percentage
                anomalies.append({
                    "type": "poor_shooting_performance",
                    "metric": "field_goal_percentage",
                    "value": performance.field_goal_percentage,
                    "threshold": 0.35,
                    "severity": "moderate"
                })
        
        return anomalies


# FastAPI integration for the basketball-biotech module
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="Basketball-Biotech Integration API",
    version="2.0.0",
    description="Advanced integration of basketball analytics and biotech data for performance optimization"
)

integrator = BasketballBiotechIntegrator()


class BiometricDataRequest(BaseModel):
    """Request model for biometric data."""
    player_id: str
    timestamp: Optional[str] = None
    heart_rate: Optional[float] = None
    heart_rate_variability: Optional[float] = None
    sleep_duration_hours: Optional[float] = None
    sleep_quality: Optional[float] = None
    hydration_level: Optional[float] = None
    body_temperature: Optional[float] = None
    blood_pressure_systolic: Optional[float] = None
    blood_pressure_diastolic: Optional[float] = None
    oxygen_saturation: Optional[float] = None
    cortisol_level: Optional[float] = None
    inflammation_markers: Optional[float] = None
    lactate_level: Optional[float] = None
    muscle_soreness: Optional[float] = None
    stress_level: Optional[float] = None


class PerformanceMetricsRequest(BaseModel):
    """Request model for performance metrics."""
    player_id: str
    timestamp: Optional[str] = None
    points: Optional[float] = None
    assists: Optional[float] = None
    rebounds: Optional[float] = None
    steals: Optional[float] = None
    blocks: Optional[float] = None
    turnovers: Optional[float] = None
    field_goal_percentage: Optional[float] = None
    three_point_percentage: Optional[float] = None
    free_throw_percentage: Optional[float] = None
    minutes_played: Optional[float] = None
    plus_minus: Optional[float] = None
    player_efficiency_rating: Optional[float] = None
    usage_rate: Optional[float] = None


class IntegrationRequest(BaseModel):
    """Request model for integration analysis."""
    biometric_data: BiometricDataRequest
    performance_metrics: PerformanceMetricsRequest


@app.post("/api/v2/integrate")
async def integrate_data(request: IntegrationRequest):
    """Integrate basketball and biotech data for comprehensive analysis."""
    try:
        # Parse timestamps
        bio_timestamp = datetime.fromisoformat(request.biometric_data.timestamp) if request.biometric_data.timestamp else datetime.now()
        perf_timestamp = datetime.fromisoformat(request.performance_metrics.timestamp) if request.performance_metrics.timestamp else datetime.now()
        
        # Create data objects
        biometric = BiometricData(
            player_id=request.biometric_data.player_id,
            timestamp=bio_timestamp,
            **{k: v for k, v in request.biometric_data.dict().items() 
               if k not in ['player_id', 'timestamp'] and v is not None}
        )
        
        performance = PerformanceMetrics(
            player_id=request.performance_metrics.player_id,
            timestamp=perf_timestamp,
            **{k: v for k, v in request.performance_metrics.dict().items() 
               if k not in ['player_id', 'timestamp'] and v is not None}
        )
        
        # Perform integration
        result = integrator.integrate_data(biometric, performance)
        
        # Convert result to dict
        result_dict = {
            "player_id": result.player_id,
            "analysis_timestamp": result.analysis_timestamp.isoformat(),
            "performance_score": result.performance_score,
            "health_score": result.health_score,
            "fatigue_level": result.fatigue_level.value,
            "injury_risk": result.injury_risk.value,
            "recovery_priority": result.recovery_priority.value,
            "readiness_to_play": result.readiness_to_play,
            "optimization_opportunities": result.optimization_opportunities,
            "personalized_recommendations": result.personalized_recommendations,
            "predicted_performance": result.predicted_performance,
            "confidence_score": result.confidence_score,
            "metadata": result.metadata
        }
        
        return result_dict
        
    except Exception as e:
        logger.error(f"Integration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Integration failed: {str(e)}")


@app.get("/api/v2/player/{player_id}/history")
async def get_player_history(player_id: str, days: int = 30):
    """Get historical analysis for a player."""
    if player_id not in integrator.player_history:
        return {"player_id": player_id, "has_history": False}
    
    history = integrator.player_history[player_id]
    
    # Filter by days
    cutoff = datetime.now() - timedelta(days=days)
    filtered_history = [(ts, data) for ts, data in history if ts > cutoff]
    
    # Format response
    formatted_history = []
    for timestamp, data in filtered_history:
        formatted_history.append({
            "timestamp": timestamp.isoformat(),
            "performance_score": data['analysis']['performance_score'],
            "health_score": data['analysis']['health_score'],
            "fatigue_level": data['analysis']['fatigue_level'],
            "readiness_to_play": data['analysis']['readiness_to_play']
        })
    
    return {
        "player_id": player_id,
        "has_history": True,
        "analysis_count": len(formatted_history),
        "time_span_days": days,
        "history": formatted_history,
        "trend_analysis": integrator._analyze_trends(player_id)
    }


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Basketball-Biotech Integration API",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "=" * 80)
    print("  BASKETBALL-BIOTECH INTEGRATION API")
    print("=" * 80)
    print("\n  Starting server on http://localhost:8002")
    print("\n  Endpoints:")
    print("    - Health Check:            http://localhost:8002/health")
    print("    - Integration Analysis:    http://localhost:8002/api/v2/integrate")
    print("    - Player History:          http://localhost:8002/api/v2/player/{player_id}/history")
    print("\n  Features:")
    print("    - Advanced fatigue assessment")
    print("    - Injury risk prediction")
    print("    - Performance optimization")
    print("    - Personalized recommendations")
    print("    - Historical trend analysis")
    print("\n" + "=" * 80 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8002, log_level="info")