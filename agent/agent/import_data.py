"""
客服工单数据导入和向量化模块
"""
import pandas as pd
import ollama
from typing import List, Dict
from tqdm import tqdm
from . import config


class TicketImportData:
    """客服工单数据导入器"""
    
    def __init__(self, csv_path: str):
        self.csv_path = csv_path
        self.embed_model = config.EMBED_MODEL
    
    def load_and_prepare(self) -> List[Dict]:
        """加载CSV数据并准备向量化"""
        print("加载客服工单数据...")
        df = pd.read_csv(self.csv_path, encoding='utf-8')
        print(f"成功加载 {len(df)} 条工单记录")
        
        # 数据清洗
        df = self._clean_data(df)
        
        tickets = []
        print("准备工单数据...")
        for _, row in tqdm(df.iterrows(), total=len(df), desc="处理工单数据"):
            # 构建用于向量化的文本描述
            text = self._build_text_description(row)
            
            tickets.append({
                'id': str(row['ticket_id']),
                'text': text,
                'metadata': {
                    'ticket_id': str(row['ticket_id']),
                    'customer_name': row['customer_name'],
                    'issue_type': row['issue_type'],
                    'description': row['description'],
                    'solution': row['solution'],
                    'status': row['status'],
                    'priority': row['priority'],
                    'agent': row['agent'],
                    'satisfaction': float(row['satisfaction']) if pd.notna(row['satisfaction']) else 0.0
                }
            })
        
        print(f"准备完成 {len(tickets)} 条工单数据")
        return tickets
    
    def _clean_data(self, df: pd.DataFrame) -> pd.DataFrame:
        """简单的数据清洗"""
        # 删除重复数据
        df = df.drop_duplicates(subset=['ticket_id'])
        
        # 删除关键字段缺失的行
        df = df.dropna(subset=['ticket_id', 'issue_type', 'description', 'solution'])
        
        # 填充可选字段的缺失值
        df['customer_name'] = df['customer_name'].fillna('未知客户')
        df['status'] = df['status'].fillna('已解决')
        df['priority'] = df['priority'].fillna('中')
        df['agent'] = df['agent'].fillna('未知客服')
        
        return df
    
    def _build_text_description(self, row) -> str:
        """构建工单的文本描述用于向量化"""
        # 构建丰富的文本描述，突出问题和解决方案
        description = f"""
工单编号: {row['ticket_id']}
问题类型: {row['issue_type']}
优先级: {row['priority']}
状态: {row['status']}

问题描述:
{row['description']}

解决方案:
{row['solution']}

处理客服: {row['agent']}
客户满意度: {row['satisfaction'] if pd.notna(row['satisfaction']) else '未评价'}
        """.strip()
        
        return description
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """批量生成文本向量"""
        print(f"正在生成 {len(texts)} 个文本的向量...")
        embeddings = []
        
        for i, text in enumerate(tqdm(texts, desc="生成向量")):
            try:
                # 调用Ollama生成向量
                response = ollama.embeddings(
                    model=self.embed_model,
                    prompt=text
                )
                embeddings.append(response['embedding'])
            except Exception as e:
                print(f"向量生成失败: {e}")
                # 使用零向量作为fallback
                embeddings.append([0.0] * 768)  # 假设向量维度为768
        
        print("向量生成完成")
        return embeddings
